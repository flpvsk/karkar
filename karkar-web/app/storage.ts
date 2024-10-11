// eslint-disable-next-line import/no-unresolved
import { DatabaseSync } from "node:sqlite"
import { AppContext, Question } from "./interfaces"
import { mapSqlToQuestion } from "./mappers"

let _db: DatabaseSync | undefined

function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(":memory:")

    _db.exec(`CREATE TABLE questions(
      id TEXT PRIMARY KEY,
      name TEXT,
      text TEXT,
      answerId TEXT
    ) STRICT`)

    _db.exec(`CREATE TABLE answers(
      id TEXT PRIMARY KEY,
      text TEXT
    ) STRICT`)

    const insertQ = _db.prepare(
      "INSERT INTO questions (id, name, text, answerId) " +
        "VALUES (?, ?, ?, ?)",
    )
    insertQ.run("q1", "1", "Question 1 text", "q1a1")
    insertQ.run("q2", "2", "Question 2 text", "q2a2")

    const insertA = _db.prepare(
      "INSERT INTO answers (id, text) " + "VALUES (?, ?)",
    )
    insertA.run("q1a1", "Answer 1 to Q1")
    insertA.run("q1a2", "Answer 2 to Q1")
    insertA.run("q1a3", "Answer 3 to Q1")

    insertA.run("q2a1", "Answer 1 to Q2")
    insertA.run("q2a2", "Answer 2 to Q2")
  }

  return _db
}

export async function getNextQuestion(ctx: AppContext): Promise<Question> {
  console.log(ctx)
  const db = getDb()
  const selectQ = db.prepare(
    "SELECT id, name, text, answerId FROM questions LIMIT 1",
  )
  const sqlQ = selectQ.all()[0] as Record<string, string> | undefined
  if (!sqlQ) throw new Error("No questions")

  const q = mapSqlToQuestion(sqlQ)
  console.log(q)
  return q
}
