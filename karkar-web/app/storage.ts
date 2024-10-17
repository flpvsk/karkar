// eslint-disable-next-line import/no-unresolved
import { DatabaseSync } from "node:sqlite"
import {
  AppContext,
  ID,
  Question,
  QuestionReport,
  QuestionReportFull,
  Score,
} from "./interfaces"
import { mapSqlToQuestion } from "./mappers"
import * as clock from "./clock"
import { stringOrDefault } from "./utils/strings"
import { differenceInHours } from "date-fns"

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

export async function getNextNotSeenQuestion(
  ctx: AppContext,
): Promise<Question> {
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

interface LogQueryRecord {
  id: ID
  questionId: ID
  timestamp: string
  isCorrect: number
}

function initScore(): Score {
  return {
    attempts: 0,
    correct: 0,
    percent: null,
  }
}

function initReport(questionId: ID, lastIsCorrect?: boolean): QuestionReport {
  return {
    questionId,
    lastIsCorrect,
    overallScore: initScore(),
    last24Score: initScore(),
    last48Score: initScore(),
    last96Score: initScore(),
    last384Score: initScore(),
  }
}

function updateScore(
  report: QuestionReport,
  isCorrect: boolean,
  cutoff: string = "overall",
): QuestionReport {
  const scoreName = `${cutoff}Score` as Exclude<
    keyof QuestionReport,
    "lastIsCorrect" | "questionId"
  >
  const score = report[scoreName]
  const { attempts, correct } = score
  const newAttempts = attempts + 1
  const newCorrect = correct + Number(isCorrect)
  return {
    ...report,
    [scoreName]: {
      attempts: newAttempts,
      correct: newCorrect,
      percent: newCorrect / newAttempts,
    },
  }
}

export async function getRecentQuestionReports(
  prioritizeQuestionId: ID | undefined,
  ctx: AppContext,
): Promise<QuestionReportFull[]> {
  const db = getDb()
  const questionIdQuery = db.prepare(
    "SELECT DISTINCT questionId" +
      " FROM log" +
      " WHERE userId = :userId" +
      " ORDER BY id desc" +
      " LIMIT 10",
  )
  const questionIdLogs = questionIdQuery.all({
    userId: ctx.userId,
  }) as LogQueryRecord[]
  const orderByQuestionId: Record<ID, number> = {}
  let order = 0
  if (prioritizeQuestionId) {
    orderByQuestionId[prioritizeQuestionId] = order++
  }

  for (const log of questionIdLogs) {
    // max 10 reports
    if (order >= 9) break
    if (!Object.hasOwn(orderByQuestionId, log.questionId)) {
      orderByQuestionId[log.questionId] = order++
    }
  }
  const questionIds = Array.from(Object.keys(orderByQuestionId))

  // COPY-PASTE
  const logQuery = db.prepare(
    "SELECT id, questionId, timestamp, isCorrect" +
      " FROM log" +
      " WHERE userId = :userId" +
      " AND questionId IN (" +
      questionIds.map(() => `?`).join(", ") +
      ")" +
      " ORDER BY id",
  )

  const logs = logQuery.all(
    { userId: ctx.userId },
    ...questionIds,
  ) as LogQueryRecord[]
  const reports: Map<ID, QuestionReport> = new Map()
  const now = new Date()
  for (const log of logs) {
    const hours = differenceInHours(now, log.timestamp)
    const isCorrect = Boolean(log.isCorrect ?? false)
    let report =
      reports.get(log.questionId) ?? initReport(log.questionId, isCorrect)
    for (const cutoff of [24, 48, 96, 384]) {
      if (hours < cutoff) {
        report = updateScore(report, isCorrect, `last${cutoff}`)
      }
    }
    report = updateScore(report, isCorrect)
    reports.set(log.questionId, report)
  }

  const fullReports: Map<
    ID,
    Omit<QuestionReportFull, "questionName">
  > = new Map()
  for (const [questionId, report] of reports.entries()) {
    if (!report) continue
    const raiting =
      0 -
      10 * (1 - Number(report.lastIsCorrect)) -
      1 * Number(report.last24Score.attempts === 0) -
      3 * Number(report.last48Score.attempts === 0) -
      6 * Number(report.last96Score.attempts === 0) -
      12 * Number(report.last384Score.attempts === 0) +
      12 * (report.last24Score.percent ?? 0) +
      6 * (report.last48Score.percent ?? 0) +
      3 * (report.last96Score.percent ?? 0) +
      1 * (report.last384Score.percent ?? 0)

    fullReports.set(questionId, {
      ...report,
      raiting,
    })
  }

  const questionIdsQ = db.prepare(
    `SELECT id, name FROM questions WHERE id IN (` +
      questionIds.map(() => `?`).join(", ") +
      ")",
  )
  return (questionIdsQ.all(...questionIds) as { id: ID; name: string }[])
    .map<QuestionReportFull>((o) => {
      const report = fullReports.get(o.id)
      if (report) {
        return {
          ...report,
          questionName: o.name,
        }
      }

      return {
        ...initReport(o.id),
        questionName: o.name,
        raiting: 0,
      }
    })
    .sort(
      (r1, r2) =>
        orderByQuestionId[r1.questionId] - orderByQuestionId[r2.questionId],
    )
}

export async function getQuestionReports(
  ctx: AppContext,
): Promise<QuestionReportFull[]> {
  const db = getDb()
  const logQuery = db.prepare(
    "SELECT id, questionId, timestamp, isCorrect" +
      " FROM log" +
      " WHERE userId = :userId" +
      " ORDER BY id",
  )

  const logs = logQuery.all({ userId: ctx.userId }) as LogQueryRecord[]
  const reports: Map<ID, QuestionReport> = new Map()
  const now = new Date()

  let dropQuestionId = undefined
  for (const log of logs) {
    dropQuestionId = log.questionId

    const hours = differenceInHours(now, log.timestamp)
    const isCorrect = Boolean(log.isCorrect ?? false)
    let report =
      reports.get(log.questionId) ?? initReport(log.questionId, isCorrect)
    for (const cutoff of [24, 48, 96, 384]) {
      if (hours < cutoff) {
        report = updateScore(report, isCorrect, `last${cutoff}`)
      }
    }
    report = updateScore(report, isCorrect)
    reports.set(log.questionId, report)
  }

  const fullReports: Map<
    ID,
    Omit<QuestionReportFull, "questionName">
  > = new Map()
  for (const [questionId, report] of reports.entries()) {
    if (!report) continue
    const raiting =
      0 -
      10 * (1 - Number(report.lastIsCorrect)) -
      1 * Number(report.last24Score.attempts === 0) -
      3 * Number(report.last48Score.attempts === 0) -
      6 * Number(report.last96Score.attempts === 0) -
      12 * Number(report.last384Score.attempts === 0) +
      12 * (report.last24Score.percent ?? 0) +
      6 * (report.last48Score.percent ?? 0) +
      3 * (report.last96Score.percent ?? 0) +
      1 * (report.last384Score.percent ?? 0)

    fullReports.set(questionId, {
      ...report,
      raiting,
    })
  }

  console.log(dropQuestionId)

  const questionIdsQ = db.prepare(
    `SELECT id, name FROM questions ` +
    `WHERE id<>:dropQuestionId ` +
    `ORDER BY id `
  )
  return (questionIdsQ.all({ dropQuestionId: dropQuestionId ?? "-1" }) as { id: ID; name: string }[])
    .map<QuestionReportFull>((o) => {
      const report = fullReports.get(o.id)
      if (report) {
        return {
          ...report,
          questionName: o.name,
        }
      }

      return {
        ...initReport(o.id),
        questionName: o.name,
        raiting: 0,
      }
    })
    .sort((r1, r2) => r1.raiting - r2.raiting)
}

export async function getNextRatedQuestion(
  fullReports: QuestionReportFull[],
  ctx: AppContext,
): Promise<Question> {
  const questionId = fullReports.at(0)?.questionId
  if (!questionId) throw new Error(`No questions`)
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
