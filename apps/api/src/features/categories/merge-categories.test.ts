import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { mergeCategories } = await import('./merge-categories.ts')

const OTHER_USER_ID = 'user-2'

/** The second user's own expense category and budget, which no merge of the first user may touch. */
const seedOtherUser = (sqlite: DatabaseSync) => {
  sqlite.prepare(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, 'Ben', 'ben@example.com', 1, 1, 1)`).run(OTHER_USER_ID)
  sqlite.prepare(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('other-food', ?, 'Food', 'expense', 1)`).run(OTHER_USER_ID)
  sqlite
    .prepare(`INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('other-budget', ?, 'other-food', 500000, 'COP', 1)`)
    .run(OTHER_USER_ID)
}

const countWhere = (sqlite: DatabaseSync, sql: string, ...params: string[]) =>
  Number((sqlite.prepare(sql).get(...params) as { n: number }).n)

/** Two movements and a bill on `category-1` with a budget, and an empty `category-2` to merge them into. */
const seedSource = (sqlite: DatabaseSync) => {
  seedCardUser(sqlite)
  sqlite.prepare(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-2', ?, 'Dining', 'expense', 1)`).run(USER_ID)
  for (const id of ['charge-1', 'charge-2']) {
    sqlite
      .prepare(
        `INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES (?, ?, 'expense', 1000, 'COP', 'card-1', 'category-1', 1, 1)`,
      )
      .run(id, USER_ID)
  }
  sqlite
    .prepare(
      `INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, created_at) VALUES ('bill-1', ?, 'Rent', 1000000, 'COP', 'card-1', 'category-1', 'monthly', '2026-01-01', '2026-11-01', 1)`,
    )
    .run(USER_ID)
  sqlite
    .prepare(`INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('budget-1', ?, 'category-1', 2000000, 'COP', 1)`)
    .run(USER_ID)
}

test('a merge moves the movements, the bill and the budget, and deletes the source', async () => {
  const { sqlite, d1 } = openTestDb()
  seedSource(sqlite)

  const result = await mergeCategories(createDb(d1), USER_ID, { sourceId: 'category-1', targetId: 'category-2' })

  assert.deepEqual(result, { id: 'category-2', name: 'Dining', kind: 'expense', moved: 2 })
  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM `transaction` WHERE category_id = ?', 'category-1'), 0)
  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM `transaction` WHERE category_id = ?', 'category-2'), 2)
  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM recurring_expense WHERE category_id = ?', 'category-2'), 1)
  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM budget WHERE category_id = ?', 'category-2'), 1)
  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM category WHERE id = ?', 'category-1'), 0)
  // Every reference was moved before the source went, so nothing points at a missing row.
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), [])
})

test('when the target has a budget, its limit wins and the source budget is dropped', async () => {
  const { sqlite, d1 } = openTestDb()
  seedSource(sqlite)
  sqlite
    .prepare(`INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('budget-2', ?, 'category-2', 300000, 'COP', 1)`)
    .run(USER_ID)

  await mergeCategories(createDb(d1), USER_ID, { sourceId: 'category-1', targetId: 'category-2' })

  // node:sqlite rows have no prototype; copy them so deepStrictEqual compares the fields alone.
  const budgets = sqlite.prepare('SELECT id, amount_cents AS amount FROM budget WHERE user_id = ?').all(USER_ID).map((row) => ({ ...row }))
  assert.deepEqual(budgets, [{ id: 'budget-2', amount: 300000 }])
})

test("a merge leaves another user's categories, movements and budgets untouched", async () => {
  const { sqlite, d1 } = openTestDb()
  seedSource(sqlite)
  seedOtherUser(sqlite)

  await mergeCategories(createDb(d1), USER_ID, { sourceId: 'category-1', targetId: 'category-2' })

  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM category WHERE id = ? AND user_id = ?', 'other-food', OTHER_USER_ID), 1)
  assert.equal(
    sqlite.prepare('SELECT category_id AS category FROM budget WHERE id = ?').get('other-budget')?.category,
    'other-food',
  )
})

test("a category of another user is not found, as a source or as a target", async () => {
  const { sqlite, d1 } = openTestDb()
  seedSource(sqlite)
  seedOtherUser(sqlite)
  const db = createDb(d1)

  await assert.rejects(mergeCategories(db, USER_ID, { sourceId: 'other-food', targetId: 'category-2' }), {
    code: 'category_not_found',
    status: 404,
  })
  await assert.rejects(mergeCategories(db, USER_ID, { sourceId: 'category-1', targetId: 'other-food' }), {
    code: 'category_not_found',
    status: 404,
  })
  assert.equal(countWhere(sqlite, 'SELECT COUNT(*) AS n FROM budget WHERE category_id = ?', 'category-1'), 1)
})
