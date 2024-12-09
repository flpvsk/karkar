import { TypedResponse } from "@remix-run/node"
import { AuthErrorName } from "./errors"

export interface ErrorResponse {
  error: {
    name?: string
    message: string
  }
  isOk: false
  isError: true
}

export type LoaderResult<T> = Promise<TypedResponse<OpResult<T>>>
export type OpResult<T> = Ok<T> | ErrorResponse

interface Ok<T> {
  data: T
  isOk: true
  isError: false
}

export function ok<T>(data: T): Ok<T> {
  return {
    data,
    isOk: true,
    isError: false,
  }
}

export function error(error: unknown): ErrorResponse {
  let message = (error as Error).message
  const name = (error as Error)?.name ?? undefined

  if (typeof error === "string") {
    message = error
  }

  if (!message) {
    message = "Unknown error"
  }

  return {
    error: {
      name,
      message,
    },
    isOk: false,
    isError: true,
  }
}

export function isErrorResponse(
  result: OpResult<unknown>,
): result is ErrorResponse {
  return result.isError
}

export function isAuthErrorResponse(result: OpResult<unknown>): boolean {
  return (
    !!result && isErrorResponse(result) && result.error.name === AuthErrorName
  )
}
