import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { integer, SQLiteSyncDialect, sqliteTable } from 'drizzle-orm/sqlite-core'
import { dayFilter } from './day-filter.ts'

// The instant a movement happened, as its own table so the column is a real one.
const movement = sqliteTable('movement', {
  occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }),
})

const dialect = new SQLiteSyncDialect()

const db = new DatabaseSync(':memory:')
db.exec('CREATE TABLE movement (id TEXT PRIMARY KEY, occurred_at INTEGER NOT NULL)')
const insert = db.prepare('INSERT INTO movement (id, occurred_at) VALUES (?, ?)')

// Three movements, and the day each one falls on for the two timezones.
const MOVEMENTS = [
  { id: 'oct-20-bogota', at: '2026-10-21T02:00:00Z' }, // Oct 20, 21:00 in Bogotá
  { id: 'oct-21-bogota', at: '2026-10-22T02:00:00Z' }, // Oct 21, 21:00 in Bogotá
  { id: 'oct-21-tokyo', at: '2026-10-20T15:00:00Z' }, // Oct 21, 00:00 in Tokyo
]
for (const row of MOVEMENTS) insert.run(row.id, Date.parse(row.at))

/** The movements a window keeps, by id. */
const visible = (timeZone: string, input: { from?: string; to?: string }) => {
  const filter = dayFilter(movement.occurredAt, timeZone, input.from, input.to)
  const query = filter ? dialect.sqlToQuery(filter) : null
  const rows = db
    .prepare(`SELECT id FROM movement${query ? ` WHERE ${query.sql}` : ''}`)
    .all(...((query?.params ?? []) as SQLInputValue[]))
  return rows.map((row) => String(row.id)).sort()
}

test('the day belongs to the user, not to the server', () => {
  // The movement of Oct 20, 21:00 in Bogotá is the Oct 21 one in Tokyo.
  assert.deepEqual(visible('America/Bogota', { from: '2026-10-21' }), ['oct-21-bogota'])
  assert.deepEqual(visible('Asia/Tokyo', { from: '2026-10-21' }), ['oct-20-bogota', 'oct-21-bogota', 'oct-21-tokyo'])
})

test('the range covers the days it names', () => {
  assert.deepEqual(visible('America/Bogota', { from: '2026-10-21', to: '2026-10-22' }), ['oct-21-bogota'])
  assert.deepEqual(visible('Asia/Tokyo', { from: '2026-10-21', to: '2026-10-22' }), ['oct-20-bogota', 'oct-21-tokyo'])
})

test('one bound alone keeps the window open', () => {
  assert.deepEqual(visible('America/Bogota', { to: '2026-10-21' }), ['oct-20-bogota', 'oct-21-tokyo'])
  assert.deepEqual(visible('America/Bogota', { to: '2026-10-22' }), ['oct-20-bogota', 'oct-21-bogota', 'oct-21-tokyo'])
  assert.deepEqual(visible('Asia/Tokyo', { from: '2026-10-22' }), ['oct-21-bogota'])
})

test('without bounds nothing is filtered', () => {
  assert.deepEqual(visible('America/Bogota', {}), ['oct-20-bogota', 'oct-21-bogota', 'oct-21-tokyo'])
})
