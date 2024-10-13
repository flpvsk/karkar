import { TypedResponse } from "@remix-run/node"

export interface ErrorResponse {
  error: {
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

  if (typeof error === "string") {
    message = error
  }

  if (!message) {
    message = "Unknown error"
  }

  return {
    error: {
      message,
    },
    isOk: false,
    isError: true,
  }
}
