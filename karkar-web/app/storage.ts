// eslint-disable-next-line import/no-unresolved
import { DatabaseSync } from "node:sqlite"
import { AppContext, ID, Question } from "./interfaces"
import { mapSqlToQuestion } from "./mappers"
import * as clock from "./clock"
import {stringOrDefault} from "./utils/strings"

let _db: DatabaseSync | undefined

function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(stringOrDefault(process.env.SQLITE, ":memory:"))

    _db.exec(`CREATE TABLE IF NOT EXISTS questions(
      id TEXT PRIMARY KEY,
      name TEXT,
      text TEXT,
      answerId TEXT
    ) STRICT`)

    _db.exec(`CREATE TABLE IF NOT EXISTS answers(
      id TEXT PRIMARY KEY,
      questionId TEXT,
      text TEXT
    ) STRICT`)

    _db.exec(`CREATE TABLE IF NOT EXISTS log(
      id TEXT PRIMARY KEY,
      parentId TEXT,
      type TEXT,
      userId TEXT,
      questionId TEXT,
      userAnswerId TEXT,
      correctAnswerId TEXT,
      isCorrect INTEGER,
      timestamp TEXT
    ) STRICT`)

    const insertQ = _db.prepare(
      "INSERT INTO questions (id, name, text, answerId) " +
        "VALUES (?, ?, ?, ?)",
    )
    const insertA = _db.prepare(
      "INSERT INTO answers (id, questionId, text) " + "VALUES (?, ?, ?)",
    )

    // TODO remove
    try {
      insertQ.run("q1", "1", "Question 1 text", "q1a1")
      insertQ.run("q2", "2", "Question 2 text", "q2a2")

      insertA.run("q1a1", "q1", "Answer 1 to Q1")
      insertA.run("q1a2", "q1", "Answer 2 to Q1")
      insertA.run("q1a3", "q1", "Answer 3 to Q1")

      insertA.run("q2a1", "q2", "Answer 1 to Q2")
      insertA.run("q2a2", "q2", "Answer 2 to Q2")
    } catch  {
    }
  }

  return _db
}

export async function getNextQuestion(ctx: AppContext): Promise<Question> {
  return getQuestionById({id: "q1"}, ctx)
}

export async function getQuestionById(
  query: { id: ID },
  _ctx: AppContext,
): Promise<Question> {
  const db = getDb()
  const selectQ = db.prepare(
    "SELECT id, name, text, answerId FROM questions WHERE id=:id LIMIT 1",
  )
  const sqlQ = selectQ.all({ id: query.id })[0] as
    | Record<string, string>
    | undefined
  if (!sqlQ) throw new Error("No questions")

  const selectA = db.prepare(
    "SELECT id, text FROM answers WHERE questionId=:questionId",
  )
  const sqlA = selectA.all({ questionId: query.id }) as
    | Record<string, string>[]
    | undefined

  const q = mapSqlToQuestion(sqlQ, sqlA ?? [])
  console.log(q)
  return q
}

interface LogCheckInput {
  questionId: ID
  userAnswerId?: ID
  correctAnswerId: ID
  isCorrect: boolean
}

export async function logCheck(
  input: LogCheckInput,
  ctx: AppContext,
): Promise<void> {
  const db = getDb()
  const lastId = await getLastLogId()
  const insertLog = db.prepare(
    "INSERT INTO log(" +
      "id, parentId, timestamp, type, userId, questionId, userAnswerId, correctAnswerId, isCorrect" +
      ") VALUES (" +
      ":id, :parentId, :timestamp, :type, :userId, :questionId, :userAnswerId, :correctAnswerId, :isCorrect" +
      ")",
  )

  const result = insertLog.run({
    id: clock.getNext(getInstanceId(), lastId),
    parentId: lastId ?? null,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
    questionId: input.questionId,
    userAnswerId: input.userAnswerId ?? null,
    correctAnswerId: input.correctAnswerId,
    isCorrect: Number(input.isCorrect),
  })

  console.log("xxx insert result", result)
}

export async function getLastLogId(): Promise<ID | undefined> {
  const db = getDb()
  const selectQ = db.prepare("SELECT id FROM log LIMIT 1")
  return (selectQ.all()[0] as any)?.id ?? undefined
}

export function getInstanceId(): string {
  console.log("instance", process.env.INSTANCE_ID)
  return process.env.INSTANCE_ID!
}
