import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url).href)
const files = readdirSync(migrations)
  .filter((name) => name.endsWith('.sql'))
  .sort()

/** The SQL of one migration, split where drizzle-kit puts its statement breakpoint. */
const statements = (name: string) =>
  readFileSync(join(migrations, name), 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean)

/**
 * The SQL was hand-edited: drizzle-kit writes `ADD … REFERENCES counterparty(id)` for SQLite and
 * drops the `ON DELETE set null` the schema asks for, which would make deleting a contact fail.
 * This test keeps a later `db:generate` from silently taking the action away again.
 */
test('the migration that links an expected income to a contact keeps ON DELETE set null', () => {
  const linking = files.find((name) =>
    /ALTER TABLE `expected_income` ADD `counterparty_id`/.test(readFileSync(join(migrations, name), 'utf8')),
  )
  assert.ok(linking, 'a migration adds expected_income.counterparty_id')

  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  for (const name of files.filter((file) => file < linking)) {
    for (const statement of statements(name)) sqlite.exec(statement)
  }
  sqlite.exec(
    `INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('u1', 'Ana', 'ana@example.com', 1, 1, 1)`,
  )
  sqlite.exec(`INSERT INTO counterparty (id, user_id, name, kind, created_at) VALUES ('c1', 'u1', 'KURBUO', 'business', 1)`)
  sqlite.exec(
    `INSERT INTO expected_income (id, user_id, name, amount_cents, currency, frequency, next_on, active, created_at) VALUES ('i1', 'u1', 'Salario', 500000000, 'COP', 'monthly', '2026-11-05', 1, 1)`,
  )

  for (const statement of statements(linking)) sqlite.exec(statement)

  const columns = sqlite.prepare('PRAGMA table_info(expected_income)').all().map((column) => column.name)
  assert.ok(columns.includes('counterparty_id'))
  // The row written before the migration is still whole, with no contact yet.
  assert.deepEqual(
    { ...sqlite.prepare('SELECT name, amount_cents, counterparty_id FROM expected_income').get() },
    { name: 'Salario', amount_cents: 500000000, counterparty_id: null },
  )

  const foreignKey = sqlite
    .prepare('PRAGMA foreign_key_list(expected_income)')
    .all()
    .find((key) => key.from === 'counterparty_id')
  assert.equal(foreignKey?.table, 'counterparty')
  assert.equal(foreignKey?.on_delete, 'SET NULL')

  sqlite.exec(`UPDATE expected_income SET counterparty_id = 'c1'`)
  sqlite.exec(`DELETE FROM counterparty WHERE id = 'c1'`)
  assert.equal(sqlite.prepare('SELECT counterparty_id FROM expected_income').get()!.counterparty_id, null)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM expected_income').get()!.n, 1)
})
