import { json } from "@remix-run/node"
import {
  Form,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
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
import { useState } from "react"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
]

type ID = string

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<TypedResponse<{ userId: ID }>> => {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await userPrefs.parse(cookieHeader)) ?? {}
  let userId = cookie.userId
  const headers: Record<string, string> = {}

  if (!userId) {
    userId = nanoid(3)
    headers["Set-Cookie"] = await userPrefs.serialize({ userId })
  }

  const data = { userId }
  return json(data, { headers })
}

export async function action({ request }: ActionFunctionArgs) {
  const bodyParams = await request.formData()
  const userId = bodyParams.get("userId")
  return json(
    { userId },
    {
      headers: {
        ["Set-Cookie"]: await userPrefs.serialize({ userId }),
      },
    },
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { userId } = useLoaderData<typeof loader>()
  const [isUserFormVisible, setIsUserFormVisible] = useState(false)
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
          <div>Karkar – flashcards for Einbürgerungstest</div>
          <div>
            Current user: {userId}
            {!isUserFormVisible && (
              <button type="button" onClick={() => setIsUserFormVisible(true)}>
                Change
              </button>
            )}
          </div>
          {isUserFormVisible && (
            <Form
              key="user"
              id="user"
              method="post"
              onSubmit={() => setIsUserFormVisible(false)}
            >
              <label htmlFor="userId">New user:</label>
              <input
                defaultValue={userId}
                type="text"
                name="userId"
                id="userId"
              />
              <button type="submit">Save</button>
              <button type="button" onClick={() => setIsUserFormVisible(false)}>
                Cancel
              </button>
            </Form>
          )}
        </header>
        <nav>
          <ul>
            <li>
              <Link to="/">Practice</Link>
            </li>
            <li>
              <Link to="/stats">Stats</Link>
            </li>
          </ul>
        </nav>
        <main>{children}</main>
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
