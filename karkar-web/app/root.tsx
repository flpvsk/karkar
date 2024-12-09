import { json, redirect } from "@remix-run/node"
import {
  Form,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  useLoaderData,
  useActionData,
  useRouteError,
} from "@remix-run/react"
import type {
  ActionFunctionArgs,
  CookieSerializeOptions,
  LinksFunction,
  LoaderFunctionArgs,
} from "@remix-run/node"
import appStylesHref from "./app.css?url"
import { userPrefs } from "./cookies.server"
import { nanoid } from "nanoid"
import { UIMatch, useMatches } from "react-router"
import { ID } from "./interfaces"
import { cx } from "./utils/components"
import { parseUserId, USER_ID_LENGTH } from "./validation"
import { addYears, differenceInSeconds } from "date-fns"
import { RandomLoginLink } from "./components/RandomLoginLink"
import {
  LoaderResult,
  error,
  isAuthErrorResponse,
  isErrorResponse,
  ok,
} from "./LoaderResult"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
]

export const loader = async ({
  request,
}: LoaderFunctionArgs): LoaderResult<{ userId: ID }> => {
  const url = new URL(request.url)
  let userId = url.searchParams.get("userId")
  const urlPath = url.pathname
  const headers: Record<string, string> = {}
  const cookieOpts = getUserCookieOpts(new Date())

  if (userId) {
    userId = parseUserId(userId)
    headers["Set-Cookie"] = await userPrefs.serialize({ userId }, cookieOpts)
    return redirect(urlPath, { headers })
  }

  if (!userId) {
    const cookieHeader = request.headers.get("Cookie")
    const cookie = (await userPrefs.parse(cookieHeader)) ?? {}
    userId = cookie.userId
  }

  if (!userId) {
    userId = nanoid(USER_ID_LENGTH)
    headers["Set-Cookie"] = await userPrefs.serialize({ userId }, cookieOpts)
    return redirect(urlPath, { headers })
  }

  try {
    userId = parseUserId(userId)

    const data = { userId }
    return json(ok(data), { headers })
  } catch (e) {
    return json(error(e), { headers })
  }
}

function getUserCookieOpts(now: Date): CookieSerializeOptions {
  const expires = addYears(now, 1)
  const maxAge = differenceInSeconds(expires, now)
  return { expires, maxAge }
}

export async function action({ request }: ActionFunctionArgs) {
  const bodyParams = await request.formData()
  let userId = String(bodyParams.get("userId") ?? "")
  const cookieOpts = getUserCookieOpts(new Date())

  try {
    userId = parseUserId(userId)
  } catch (e) {
    return json(error(e))
  }

  return json(ok({ userId }), {
    headers: {
      ["Set-Cookie"]: await userPrefs.serialize({ userId }, cookieOpts),
    },
  })
}

function isRouteMatch(routePath: string, routeMatches: UIMatch[]): boolean {
  for (const match of routeMatches) {
    if (match.id === routePath) return true
  }
  return false
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const matches = useMatches()

  if (loaderData && isAuthErrorResponse(loaderData)) {
    return (
      <Frame>
        <RandomLoginLink />
      </Frame>
    )
  }

  if (loaderData && isErrorResponse(loaderData)) {
    return (
      <Frame>
        <div>Unknown error: {loaderData.error.message}</div>
      </Frame>
    )
  }

  const userId = loaderData?.data?.userId

  return (
    <Frame>
      <header>
        <div className="siteAndVersion">
          <h1>Flashcards for Einbürgerungstest in Berlin</h1>
          <span className="__subtle">v1</span>
        </div>
        <div className="userInfo">
          <div className="userInfo__currentUser">Current user: {userId}</div>
          <Form
            key="user"
            id="user"
            method="post"
            className="userInfo__changeUserForm"
          >
            <div className="userInfo__inputBlock">
              <label htmlFor="userId">Change user to:</label>
              <input
                className="userInfo__input"
                defaultValue={userId}
                maxLength={8}
                minLength={8}
                type="text"
                name="userId"
                id="userId"
              />
              <button type="submit">Change</button>
            </div>
            <div className="userInfo__error">
              {actionData &&
                isErrorResponse(actionData) &&
                actionData?.error?.message}
            </div>
          </Form>
        </div>
      </header>
      <nav>
        <ul className="menu">
          <li>
            <Link
              to="/"
              className={cx({
                menu__menuItem: true,
                _matched: isRouteMatch("routes/_index", matches),
              })}
            >
              Practice
            </Link>
          </li>
          <li>
            <Link
              to="/stats"
              className={cx({
                menu__menuItem: true,
                _matched: isRouteMatch("routes/stats", matches),
              })}
            >
              Stats
            </Link>
            <Link
              to="/about"
              className={cx({
                menu__menuItem: true,
                _matched: isRouteMatch("routes/about", matches),
              })}
            >
              About
            </Link>
          </li>
        </ul>
      </nav>
      <main className="main">{children}</main>
    </Frame>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary() {
  const error = useRouteError()
  return (
    <html lang="en">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="errorText">Error: {(error as Error)?.message}</div>
        <Scripts />
      </body>
    </html>
  )
}
