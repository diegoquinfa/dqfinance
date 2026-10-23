import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { openTestDb } from './fake-d1.ts'
import { seedCardUser, USER_ID } from './seed.ts'

const countCategories = (sqlite: DatabaseSync, id: string) =>
  sqlite.prepare(`SELECT COUNT(*) AS n FROM category WHERE id = ?`).get(id)?.n

test('foreign keys are enforced: a row that points at nothing is refused', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  assert.equal(sqlite.prepare('PRAGMA foreign_keys').get()?.foreign_keys, 1)
  await assert.rejects(
    d1.prepare(`INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('budget-1', ?, 'missing', 1, 'COP', 1)`).bind(USER_ID).run(),
    /FOREIGN KEY/,
  )
})

test('a category a transaction uses cannot be deleted (ON DELETE restrict holds)', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite
    .prepare(
      `INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('charge', ?, 'expense', 1000, 'COP', 'card-1', 'category-1', 1, 1)`,
    )
    .run(USER_ID)
  await assert.rejects(d1.prepare(`DELETE FROM category WHERE id = 'category-1'`).bind().run(), /FOREIGN KEY/)
  assert.equal(countCategories(sqlite, 'category-1'), 1)
})

test('a batch is one transaction: when its 2nd statement fails, its 1st leaves no row', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  await assert.rejects(
    d1.batch([
      d1.prepare(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-2', ?, 'Dining', 'expense', 1)`).bind(USER_ID),
      d1.prepare(`INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('budget-1', ?, 'missing', 1, 'COP', 1)`).bind(USER_ID),
    ]),
    /FOREIGN KEY/,
  )
  assert.equal(countCategories(sqlite, 'category-2'), 0)
  // The failed batch closed its transaction: the next one opens and commits its own.
  const ok = await d1.batch([
    d1.prepare(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-3', ?, 'Travel', 'expense', 1)`).bind(USER_ID),
  ])
  assert.equal(ok[0]?.meta.changes, 1)
  assert.equal(countCategories(sqlite, 'category-3'), 1)
})

test('raw returns each row as an array, so two columns both named id come back', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite
    .prepare(
      `INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('charge', ?, 'expense', 1000, 'COP', 'card-1', 'category-1', 1, 1)`,
    )
    .run(USER_ID)
  const rows = await d1
    .prepare(`SELECT "transaction".id, card.id FROM "transaction" JOIN card ON card.id = "transaction".card_id`)
    .bind()
    .raw()
  assert.deepEqual(rows, [['charge', 'card-1']])
})

test('run answers with the D1 shape and meta.changes', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const updated = await d1.prepare(`UPDATE category SET name = 'Groceries' WHERE user_id = ?`).bind(USER_ID).run()
  assert.equal(updated.success, true)
  assert.deepEqual(updated.results, [])
  assert.equal(updated.meta.changes, 1)
  const none = await d1.prepare(`UPDATE category SET name = 'Nothing' WHERE id = 'missing'`).bind().run()
  assert.equal(none.meta.changes, 0)
})
