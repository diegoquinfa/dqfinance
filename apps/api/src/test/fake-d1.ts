import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url).href)

type Row = Record<string, unknown>

const rows = (sqlite: DatabaseSync, sql: string, params: SQLInputValue[]): Row[] =>
  sqlite.prepare(sql).all(...params)

/**
 * The slice of `D1Database` that drizzle's d1 driver uses, over a real SQLite database: it prepares
 * a statement, binds its parameters, and reads the rows. Test-only; nothing here reimplements SQL.
 */
const fakeD1 = (sqlite: DatabaseSync): D1Database => {
  const bound = (sql: string, params: SQLInputValue[]) => ({
    all: async () => ({ results: rows(sqlite, sql, params), success: true, meta: {} }),
    // Drizzle maps a select result by column position, which is what `raw()` gives it.
    raw: async () => rows(sqlite, sql, params).map((row) => Object.values(row)),
    run: async () => sqlite.prepare(sql).run(...params),
    first: async () => rows(sqlite, sql, params)[0] ?? null,
  })
  const fake = {
    prepare: (sql: string) => ({ bind: (...params: SQLInputValue[]) => bound(sql, params) }),
    batch: async (statements: ReturnType<typeof bound>[]) => Promise.all(statements.map((statement) => statement.all())),
    exec: async (sql: string) => {
      sqlite.exec(sql)
      return { count: 0, duration: 0 }
    },
  }
  return fake as unknown as D1Database
}

/** An empty in-memory database with every migration applied, plus the D1 shim drizzle runs on. */
export const openTestDb = () => {
  const sqlite = new DatabaseSync(':memory:')
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(migrations, file), 'utf8'))
  }
  return { sqlite, d1: fakeD1(sqlite) }
}
