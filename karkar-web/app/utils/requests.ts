import { userPrefs } from "~/cookies.server"
import { AuthError } from "~/errors"

export const AuthErrorName = "AuthError"

export async function getUserId(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await userPrefs.parse(cookieHeader)) ?? {}
  const { userId } = cookie
  if (!userId) {
    throw new AuthError("User not logged in")
  }
  return userId
}
