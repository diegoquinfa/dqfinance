import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { deleteCategory } = await import('./delete-category.ts')

const categoryExists = (sqlite: DatabaseSync, id: string) =>
  sqlite.prepare('SELECT COUNT(*) AS n FROM category WHERE id = ?').get(id)?.n === 1

const seedTransaction = (sqlite: DatabaseSync) =>
  sqlite
    .prepare(
      "INSERT INTO `transaction` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('charge', ?, 'expense', 1000, 'COP', 'card-1', 'category-1', 1, 1)",
    )
    .run(USER_ID)

const seedRecurring = (sqlite: DatabaseSync) =>
  sqlite
    .prepare(
      "INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, created_at) VALUES ('bill-1', ?, 'Rent', 1000000, 'COP', 'card-1', 'category-1', 'monthly', '2026-01-01', '2026-11-01', 1)",
    )
    .run(USER_ID)

const seedBudget = (sqlite: DatabaseSync) =>
  sqlite
    .prepare("INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('budget-1', ?, 'category-1', 2000000, 'COP', 1)")
    .run(USER_ID)

test('a category a transaction uses is refused and kept', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedTransaction(sqlite)

  await assert.rejects(deleteCategory(createDb(d1), USER_ID, 'category-1'), {
    code: 'category_has_transactions',
    status: 409,
  })
  assert.ok(categoryExists(sqlite, 'category-1'))
})

test('a category a recurring bill uses is refused and kept', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedRecurring(sqlite)

  await assert.rejects(deleteCategory(createDb(d1), USER_ID, 'category-1'), { code: 'category_in_use', status: 409 })
  assert.ok(categoryExists(sqlite, 'category-1'))
})

test('a category a budget uses is refused and kept, so the limit is not dropped silently', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBudget(sqlite)

  await assert.rejects(deleteCategory(createDb(d1), USER_ID, 'category-1'), { code: 'category_in_use', status: 409 })
  assert.ok(categoryExists(sqlite, 'category-1'))
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM budget').get()?.n, 1)
})

test('an unused category is deleted', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)

  assert.deepEqual(await deleteCategory(createDb(d1), USER_ID, 'category-1'), { id: 'category-1', deleted: true })
  assert.equal(categoryExists(sqlite, 'category-1'), false)
})

test("another user's category is not found and kept", async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.prepare(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1)`).run()
  sqlite.prepare(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('other-food', 'user-2', 'Food', 'expense', 1)`).run()

  await assert.rejects(deleteCategory(createDb(d1), USER_ID, 'other-food'), { code: 'category_not_found', status: 404 })
  assert.ok(categoryExists(sqlite, 'other-food'))
})
