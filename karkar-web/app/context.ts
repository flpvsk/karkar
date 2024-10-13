import { nanoid } from "nanoid"
import { AppContext, ID } from "./interfaces"
import { parseUserId } from "./validation"

export async function createAppContext({
  userId,
}: {
  userId: ID
}): Promise<AppContext> {
  parseUserId(userId)

  return {
    userId,
    requestId: nanoid(),
  }
}
