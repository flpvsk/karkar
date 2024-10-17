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
  image: string | null
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

export interface HasRaiting {
  raiting: number
}

export interface Score {
  attempts: number
  correct: number
  percent: number | null
}

export interface QuestionReport {
  questionId: ID
  lastIsCorrect?: boolean
  overallScore: Score
  last24Score: Score
  last48Score: Score
  last96Score: Score
  last384Score: Score
}

export type QuestionReportFull = HasRaiting &
  QuestionReport & {
    questionName: string
  }
