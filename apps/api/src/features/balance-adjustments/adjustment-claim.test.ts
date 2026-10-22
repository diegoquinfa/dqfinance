import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { claimAdjustment, type AdjustmentClaim } from './adjustment-claim.ts'

const dialect = new SQLiteSyncDialect()

/** The table as the migration creates it, so the statement is proven by running it. */
const table = () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`create table balance_adjustment (
    id text primary key,
    user_id text not null,
    product_id text,
    card_id text,
    cash_wallet_id text,
    currency text not null,
    observed_balance_cents integer not null,
    delta_cents integer not null,
    note text,
    adjusted_at integer not null,
    created_at integer not null
  )`)
  return db
}

const claim = (over: Partial<AdjustmentClaim> = {}): AdjustmentClaim => ({
  id: 'adjustment-1',
  userId: 'user-1',
  ref: { type: 'product', id: 'product-1' },
  currency: 'COP',
  observedCents: 15_000,
  deltaCents: 5_000,
  note: null,
  adjustedAt: 1_000,
  createdAt: 1_000,
  ...over,
})

/** Runs the claim as the API runs it and reports the rows it wrote (0 means it was refused). */
const write = (db: DatabaseSync, row: AdjustmentClaim, readAt: number) => {
  const query = dialect.sqlToQuery(claimAdjustment(row, readAt))
  return db.prepare(query.sql).run(...(query.params as (string | number | null)[])).changes
}

const rows = (db: DatabaseSync) =>
  db
    .prepare('select id, observed_balance_cents as observed, delta_cents as delta from balance_adjustment')
    .all()
    .map((row) => ({ ...row }))

test('the first adjustment lands', () => {
  const db = table()
  assert.equal(write(db, claim(), 1_000), 1)
  assert.deepEqual(rows(db), [{ id: 'adjustment-1', observed: 15_000, delta: 5_000 }])
})

test('a second adjustment that read the same balance writes nothing', () => {
  const db = table()
  assert.equal(write(db, claim(), 1_000), 1)
  // The other tab read the same balance and sends the same correction: the cycle must not double.
  assert.equal(write(db, claim({ id: 'adjustment-2' }), 1_000), 0)
  assert.equal(rows(db).length, 1)
})

test('a balance read after the first adjustment is not blocked', () => {
  const db = table()
  assert.equal(write(db, claim(), 1_000), 1)
  // readAt is later than the row already written, so the guard has nothing after it.
  assert.equal(write(db, claim({ id: 'adjustment-2', deltaCents: -2_000 }), 2_000), 1)
  assert.equal(rows(db).length, 2)
})

test('another source or another user is not blocked by the first adjustment', () => {
  const db = table()
  assert.equal(write(db, claim(), 1_000), 1)
  assert.equal(write(db, claim({ id: 'other-source', ref: { type: 'card', id: 'card-1' } }), 1_000), 1)
  assert.equal(write(db, claim({ id: 'other-user', userId: 'user-2' }), 1_000), 1)
  assert.equal(rows(db).length, 3)
})

test('the guard is per currency on the same source', () => {
  const db = table()
  assert.equal(write(db, claim(), 1_000), 1)
  assert.equal(write(db, claim({ id: 'usd', currency: 'USD' }), 1_000), 1)
  assert.equal(write(db, claim({ id: 'cop-again' }), 1_000), 0)
  assert.equal(rows(db).length, 2)
})
