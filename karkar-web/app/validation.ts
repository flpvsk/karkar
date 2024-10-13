import { z } from "zod"
export const USER_ID_LENGTH = 8

const userId = z
  .string()
  .length(USER_ID_LENGTH)
  .regex(/^[a-zA-Z0-9]+$/)

export function parseUserId(v: any): string {
  return userId.parse(v)
}
