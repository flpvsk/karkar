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
