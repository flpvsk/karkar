import { parse } from "csv-parse/sync"
import { DatabaseSync } from "node:sqlite"
import fs from "node:fs"

// https://gist.github.com/travisbrown/b9e99fc9272615b5f9ddf756b5e666b6
const content = fs.readFileSync("./.tmp/einbürgerungstest.csv", "utf8")
const parsed = parse(content)
const db = new DatabaseSync("./.tmp/db.sqlite")
const result = db.exec(
  `DROP TABLE IF EXISTS questions;` +
  `DROP TABLE IF EXISTS answers;` +
  `CREATE TABLE IF NOT EXISTS questions(
    id TEXT PRIMARY KEY,
    name TEXT,
    text TEXT,
    answerId TEXT
  ) STRICT;` +
  `CREATE TABLE IF NOT EXISTS answers(
    id TEXT PRIMARY KEY,
    questionId TEXT,
    text TEXT
  ) STRICT;`
)

const insertQ = db.prepare(
  "INSERT INTO questions (id, name, text, answerId) " +
    "VALUES (:id, :name, :text, :answerId)"
)

const insertA = db.prepare(
  "INSERT INTO answers (id, questionId, text) " + "VALUES (:id, :questionId, :text)"
)

let i = 0
for (const row of parsed.slice(1)) {
  i += 1
  const questionName = row[0] as string
  const questionPad = questionName.padStart(3, '0')
  const questionId = `qst${questionPad}`
  const questionText = row[1] as string

  let ansNum = 1
  let answerId: string | undefined
  for (const answer of row.slice(2, 6)) {
    const id = `ans${questionPad}${ansNum}`

    if (String(ansNum) === row[6]) {
      answerId = id
    }

    insertA.run({
      id,
      text: answer,
      questionId: questionId,
    })

    ansNum += 1
  }

  insertQ.run({
    id: questionId,
    name: questionName,
    text: questionText,
    answerId,
  })
}

console.log(`${i} questions inserted`)

//     -- CSV Columns --
//     'Number',
//     'Question',
//     'Answer 1',
//     'Answer 2',
//     'Answer 3',
//     'Answer 4',
//     'Correct answer'

