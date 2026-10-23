import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { getForecast } = await import('./get-forecast.ts')

// Mid-October in Bogota: the forecast runs from the 15th to the end of the month.
const pinClock = () => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T15:00:00Z') })
afterEach(() => mock.timers.reset())

// The 10,000 COP the user holds on the 15th: an income of it, booked on the 2nd.
const seedBalance = (sqlite: DatabaseSync) =>
  sqlite.exec(`
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('income-1', 'user-1', 'income', 1000000, 'COP', 'product-1', 'category-1', ${Date.parse('2026-10-02T12:00:00Z')}, 1);
  `)

// A monthly bill of 3,000 COP on the card, due on the given date, started the month before.
const seedRent = (sqlite: DatabaseSync, nextDueOn: string) =>
  sqlite.exec(`
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('rent-1', 'user-1', 'Rent', 300000, 'COP', 'card-1', 'category-1', 'monthly', '2026-09-20', '${nextDueOn}', 1, 1);
  `)

const balancesOf = (result: Awaited<ReturnType<typeof getForecast>>) => result.days.map((point) => point.balance)

test('the first point is the balance today', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)

  const result = await getForecast(createDb(d1), USER_ID)

  assert.equal(result.day, '2026-10-15')
  assert.equal(result.periodEnd, '2026-10-31')
  assert.equal(result.days[0]?.day, '2026-10-15')
  assert.equal(result.days[0]?.balance, 10_000)
})

test('an overdue bill lowers the balance on today, once', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  // Due on the 5th and still unpaid: it takes its money today, and no day after.
  seedRent(sqlite, '2026-10-05')

  const result = await getForecast(createDb(d1), USER_ID)

  // The 15th to the 31st: seventeen days, each at 7,000 once the overdue bill is paid.
  assert.deepEqual(balancesOf(result), Array(17).fill(7_000))
})

test('a bill due later in the month lowers the balance from its day on', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  seedRent(sqlite, '2026-10-20')

  const result = await getForecast(createDb(d1), USER_ID)

  const before = result.days.filter((point) => point.day < '2026-10-20')
  const from = result.days.filter((point) => point.day >= '2026-10-20')
  assert.ok(before.length > 0 && from.length > 0)
  assert.ok(before.every((point) => point.balance === 10_000))
  assert.ok(from.every((point) => point.balance === 7_000))
})

test("another user's bill is not in the forecast", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  sqlite.exec(`
    INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1);
    INSERT INTO bank (id, user_id, name, created_at) VALUES ('bank-2', 'user-2', 'Bank', 1);
    INSERT INTO bank_account (id, user_id, bank_id, name, created_at) VALUES ('account-2', 'user-2', 'bank-2', 'Checking', 1);
    INSERT INTO product (id, user_id, bank_account_id, type, name, currency, created_at) VALUES ('product-2', 'user-2', 'account-2', 'checking', 'Card', 'COP', 1);
    INSERT INTO card (id, user_id, product_id, kind, name, created_at) VALUES ('card-2', 'user-2', 'product-2', 'credit', 'Visa', 1);
    INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-2', 'user-2', 'Food', 'expense', 1);
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('rent-2', 'user-2', 'Rent', 300000, 'COP', 'card-2', 'category-2', 'monthly', '2026-09-20', '2026-10-05', 1, 1);
  `)

  const result = await getForecast(createDb(d1), USER_ID)

  assert.deepEqual(balancesOf(result), Array(17).fill(10_000))
})

test('the lowest point is the day the balance is lowest, even when it recovers after', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  // A 15,000 COP bill on the 20th takes the balance under zero; a 20,000 COP income on the 25th lifts it.
  sqlite.exec(`
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('rent-1', 'user-1', 'Rent', 1500000, 'COP', 'card-1', 'category-1', 'monthly', '2026-09-20', '2026-10-20', 1, 1);
    INSERT INTO expected_income (id, user_id, name, amount_cents, currency, frequency, next_on, active, created_at) VALUES ('salary-1', 'user-1', 'Salary', 2000000, 'COP', 'irregular', '2026-10-25', 1, 1);
  `)

  const result = await getForecast(createDb(d1), USER_ID)

  assert.deepEqual(result.lowest, { day: '2026-10-20', balance: -5_000 })
  assert.equal(result.days.at(-1)?.balance, 15_000)
})
