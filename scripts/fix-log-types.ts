import { DatabaseSync } from "node:sqlite"

const db = new DatabaseSync("./.tmp/db.sqlite")
db.exec(`UPDATE log SET type = "check"`)

const query = db.prepare(`SELECT DISTINCT type from log;`)
console.log(query.all())

// const result = db.exec(
//   `UPDATE log SET type = "check";`
// )

