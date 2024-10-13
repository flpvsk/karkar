import { json, redirect } from "@remix-run/node"
import {
  Form,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useActionData,
  useRouteError,
} from "@remix-run/react"
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  TypedResponse,
} from "@remix-run/node"
import appStylesHref from "./app.css?url"
import { userPrefs } from "./cookies.server"
import { nanoid } from "nanoid"
import { UIMatch, useMatches } from "react-router"
import { ID } from "./interfaces"
import { cx } from "./utils/components"
import { parseUserId, USER_ID_LENGTH } from "./validation"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
]

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<TypedResponse<{ userId: ID }>> => {
  let userId = new URL(request.url).searchParams.get("userId")
  const headers: Record<string, string> = {}

  if (userId) {
    userId = parseUserId(userId)
    headers["Set-Cookie"] = await userPrefs.serialize({ userId })
    return redirect("/", { headers })
  }

  if (!userId) {
    const cookieHeader = request.headers.get("Cookie")
    const cookie = (await userPrefs.parse(cookieHeader)) ?? {}
    userId = cookie.userId
  }

  if (!userId) {
    userId = nanoid(USER_ID_LENGTH)
    headers["Set-Cookie"] = await userPrefs.serialize({ userId })
  }

  userId = parseUserId(userId)

  const data = { userId }
  return json(data, { headers })
}

export async function action({ request }: ActionFunctionArgs) {
  const bodyParams = await request.formData()
  let userId = String(bodyParams.get("userId") ?? "")

  try {
    userId = parseUserId(userId)
  } catch (e) {
    return json({
      userId,
      error: {
        message: (e as Error).message,
      },
    })
  }

  return json(
    { userId, error: null },
    {
      headers: {
        ["Set-Cookie"]: await userPrefs.serialize({ userId }),
      },
    },
  )
}

function isRouteMatch(routePath: string, routeMatches: UIMatch[]): boolean {
  for (const match of routeMatches) {
    if (match.id === routePath) return true
  }
  return false
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>()
  const userId = data?.userId

  if (!userId) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body>No userId</body>
      </html>
    )
  }
  const actionData = useActionData<typeof action>()
  const matches = useMatches()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header>
          <div>
            <b>Flashcards for Einbürgerungstest in Berlin</b>
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
                <button type="submit">Save</button>
              </div>
              <div className="userInfo__error">
                {actionData?.error?.message}
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
        <footer></footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
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
