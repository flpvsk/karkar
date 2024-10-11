import { Question } from "./interfaces"

export function mapSqlToQuestion(sqlQ: Record<string, string>): Question {
  return {
    ...sqlQ,
    answers: [],
  } as any as Question
}
