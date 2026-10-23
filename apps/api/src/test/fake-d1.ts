import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url).href)

type Statement = { sql: string; params: SQLInputValue[] }

/** What D1 answers one statement with: its rows, and the meta of the write it made. */
type Outcome = {
  success: true
  results: unknown[]
  meta: { changes: number; last_row_id: number; changed_db: boolean; duration: number; rows_read: number; rows_written: number }
}

const WRITE = /^\s*(insert|update|delete|replace)\b/i

/**
 * Runs one statement the way D1 does. A statement that returns columns answers with its rows (a
 * select, or a write with RETURNING); any other write answers with how many rows it changed.
 * `arrays` gives each row as an array, which is what drizzle's `raw()` maps by position.
 */
const execute = (sqlite: DatabaseSync, { sql, params }: Statement, arrays = false): Outcome => {
  const statement = sqlite.prepare(sql)
  let results: unknown[] = []
  let changes = 0
  let lastRowId = 0
  if (statement.columns().length === 0) {
    const run = statement.run(...params)
    changes = Number(run.changes)
    lastRowId = Number(run.lastInsertRowid)
  } else {
    statement.setReturnArrays(arrays)
    results = statement.all(...params)
    if (WRITE.test(sql)) {
      const last = sqlite.prepare('select changes() as changes, last_insert_rowid() as id').get()!
      changes = Number(last.changes)
      lastRowId = Number(last.id)
    }
  }
  return {
    success: true,
    results,
    meta: { changes, last_row_id: lastRowId, changed_db: changes > 0, duration: 0, rows_read: 0, rows_written: changes },
  }
}

/**
 * The slice of `D1Database` that drizzle's d1 driver uses, over a real SQLite database: it prepares
 * a statement, binds its parameters, and reads the rows. Test-only; nothing here reimplements SQL.
 */
const fakeD1 = (sqlite: DatabaseSync): D1Database => {
  const bound = (sql: string, params: SQLInputValue[]) => ({
    sql,
    params,
    all: async () => execute(sqlite, { sql, params }),
    raw: async () => execute(sqlite, { sql, params }, true).results,
    run: async () => execute(sqlite, { sql, params }),
    first: async () => (execute(sqlite, { sql, params }).results as Record<string, unknown>[])[0] ?? null,
  })
  const fake = {
    prepare: (sql: string) => ({ bind: (...params: SQLInputValue[]) => bound(sql, params) }),
    // D1 runs a batch as one transaction: every statement applies, or none does.
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN')
      try {
        const outcomes = statements.map((statement) => execute(sqlite, statement))
        sqlite.exec('COMMIT')
        return outcomes
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
    exec: async (sql: string) => {
      sqlite.exec(sql)
      return { count: 0, duration: 0 }
    },
  }
  return fake as unknown as D1Database
}

/**
 * An empty in-memory database with every migration applied, plus the D1 shim drizzle runs on. D1
 * enforces foreign keys. node:sqlite already does by default; the pragma pins it, so a change of
 * that default cannot silently turn the restrict and cascade guards off in a test.
 */
export const openTestDb = () => {
  const sqlite = new DatabaseSync(':memory:')
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(migrations, file), 'utf8'))
  }
  sqlite.exec('PRAGMA foreign_keys = ON')
  return { sqlite, d1: fakeD1(sqlite) }
}
