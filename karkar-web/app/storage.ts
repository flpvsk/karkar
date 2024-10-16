// eslint-disable-next-line import/no-unresolved
import { DatabaseSync } from "node:sqlite"
import { AppContext, ID, Question } from "./interfaces"
import { mapSqlToQuestion } from "./mappers"
import * as clock from "./clock"
import { stringOrDefault } from "./utils/strings"

let _db: DatabaseSync | undefined

function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(stringOrDefault(process.env.SQLITE, ":memory:"))

    _db.exec(`CREATE TABLE IF NOT EXISTS questions(
      id TEXT PRIMARY KEY,
      name TEXT,
      text TEXT,
      image TEXT,
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
  }

  return _db
}

export async function getNextQuestion(ctx: AppContext): Promise<Question> {
  const db = getDb()
  const selectQuestionId = db.prepare(
    "SELECT questions.id as questionId, MAX(log.id) as timestamp" +
      " FROM questions" +
      " LEFT JOIN log" +
      " ON log.questionId = questions.id AND log.userId = :userId" +
      " GROUP BY questions.id ORDER BY log.id, questions.id" +
      " LIMIT 1",
  )

  const { questionId } = selectQuestionId.get({
    userId: ctx.userId,
  }) as any

  return getQuestionById({ id: questionId }, ctx)
}

export async function getQuestionById(
  query: { id: ID },
  _ctx: AppContext,
): Promise<Question> {
  const db = getDb()
  const selectQ = db.prepare(
    "SELECT " +
      "id, name, text, image, answerId " +
      "FROM questions WHERE id=:id LIMIT 1",
  )
  const sqlQ = selectQ.get({ id: query.id }) as
    | Record<string, string>
    | undefined
  if (!sqlQ) throw new Error(`Question with id ${query.id} not found`)
  const selectA = db.prepare(
    "SELECT id, text FROM answers WHERE questionId=:questionId",
  )
  const sqlA = selectA.all({ questionId: query.id }) as
    | Record<string, string>[]
    | undefined

  const q = mapSqlToQuestion(sqlQ, sqlA ?? [])
  return q
}

export async function getQuestionByName(
  query: { name: string },
  _ctx: AppContext,
): Promise<Question> {
  const db = getDb()
  const selectQ = db.prepare(
    "SELECT id, name, text, image, answerId FROM questions WHERE name=:name LIMIT 1",
  )
  const sqlQ = selectQ.get({ name: query.name }) as
    | Record<string, string>
    | undefined
  if (!sqlQ) throw new Error(`Question with number ${query.name} not found`)
  const selectA = db.prepare(
    "SELECT id, text FROM answers WHERE questionId=:questionId",
  )
  const sqlA = selectA.all({ questionId: sqlQ.id }) as
    | Record<string, string>[]
    | undefined

  const q = mapSqlToQuestion(sqlQ, sqlA ?? [])
  return q
}

export interface LogCheckInput {
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

  insertLog.run({
    id: clock.getNext(getInstanceId(), lastId),
    parentId: lastId ?? null,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
    questionId: input.questionId,
    userAnswerId: input.userAnswerId ?? null,
    correctAnswerId: input.correctAnswerId,
    isCorrect: Number(input.isCorrect),
  })
}

export interface LogSkipInput {
  questionId: ID
}

export async function logSkip(
  input: LogSkipInput,
  ctx: AppContext,
): Promise<void> {
  const db = getDb()
  const lastId = await getLastLogId()
  const insertLog = db.prepare(
    "INSERT INTO log(" +
      "id, parentId, timestamp, type, userId, questionId" +
      ") VALUES (" +
      ":id, :parentId, :timestamp, :type, :userId, :questionId" +
      ")",
  )

  insertLog.run({
    id: clock.getNext(getInstanceId(), lastId),
    parentId: lastId ?? null,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
    questionId: input.questionId,
    userAnswerId: null,
    correctAnswerId: null,
    isCorrect: null,
  })
}

export async function getLastLogId(): Promise<ID | undefined> {
  const db = getDb()
  const selectQ = db.prepare("SELECT id FROM log LIMIT 1")
  return (selectQ.all()[0] as any)?.id ?? undefined
}

export function getInstanceId(): string {
  return process.env.INSTANCE_ID!
}
