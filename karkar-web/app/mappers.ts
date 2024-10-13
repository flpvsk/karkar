import { Answer, Question } from "./interfaces"

export function mapSqlToQuestion(
  sqlQ: Record<string, string>,
  sqlA: Record<string, string>[],
): Question {
  return {
    ...sqlQ,
    answers: sqlA as any as Answer[],
  } as any as Question
}
