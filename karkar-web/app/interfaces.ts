export type ID = string

export interface AppContext {
  userId: ID
  requestId: ID
}

export interface Answer {
  id: ID
  text: string
}

export interface Question {
  id: ID
  name: string
  text: string
  answers: Answer[]
  answerId: ID
}

export enum LogType {
  check = "check",
  skip = "skip",
}

export interface Log {
  id: ID
  type: LogType
  questionId: ID
  userAnswerId: ID
  correctAnswerId: ID
  isCorrect: boolean
}
