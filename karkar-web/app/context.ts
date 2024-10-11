import { nanoid } from "nanoid"
import { AppContext, ID } from "./interfaces"

export async function createAppContext({
  userId,
}: {
  userId: ID
}): Promise<AppContext> {
  return {
    userId,
    requestId: nanoid(),
  }
}
