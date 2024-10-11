import { userPrefs } from "~/cookies.server"

export async function getUserId(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await userPrefs.parse(cookieHeader)) ?? {}
  const { userId } = cookie
  if (!userId) {
    throw new Error("User not logged in")
  }
  return userId
}
