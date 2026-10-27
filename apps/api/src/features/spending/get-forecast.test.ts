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

// Ben, with a card of his own: the other user whose spending must not move Ana's forecast.
const seedOtherUser = (sqlite: DatabaseSync) =>
  sqlite.exec(`
    INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1);
    INSERT INTO bank (id, user_id, name, created_at) VALUES ('bank-2', 'user-2', 'Bank', 1);
    INSERT INTO bank_account (id, user_id, bank_id, name, created_at) VALUES ('account-2', 'user-2', 'bank-2', 'Checking', 1);
    INSERT INTO product (id, user_id, bank_account_id, type, name, currency, created_at) VALUES ('product-2', 'user-2', 'account-2', 'checking', 'Card', 'COP', 1);
    INSERT INTO card (id, user_id, product_id, kind, name, created_at) VALUES ('card-2', 'user-2', 'product-2', 'credit', 'Visa', 1);
    INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-2', 'user-2', 'Food', 'expense', 1);
  `)

type Expense = {
  id: string
  cents: number
  occurredAt: string
  userId?: string
  cardId?: string
  currency?: string
  recurringExpenseId?: string
  installmentMonths?: number
}

// An expense on the user's card, or on the other user's card when `userId` says so.
const seedExpense = (sqlite: DatabaseSync, expense: Expense) =>
  sqlite
    .prepare(
      "INSERT INTO `transaction` (id, user_id, type, amount_cents, currency, card_id, category_id, recurring_expense_id, installment_months, occurred_at, created_at) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?, ?, 1)",
    )
    .run(
      expense.id,
      expense.userId ?? USER_ID,
      expense.cents,
      expense.currency ?? 'COP',
      expense.cardId ?? 'card-1',
      expense.userId === 'user-2' ? 'category-2' : 'category-1',
      expense.recurringExpenseId ?? null,
      expense.installmentMonths ?? null,
      Date.parse(expense.occurredAt),
    )

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
  seedOtherUser(sqlite)
  sqlite.exec(`
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

test('the pace is this month spending over the days elapsed, spent from tomorrow on', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  // A second income of 100,000 on the 2nd, and 30,000 spent on the 3rd: 15 days elapsed, so 2,000 a day.
  sqlite.exec(`INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('income-2', 'user-1', 'income', 10000000, 'COP', 'product-1', 'category-1', ${Date.parse('2026-10-02T12:00:00Z')}, 1);`)
  seedExpense(sqlite, { id: 'food-1', cents: 3_000_000, occurredAt: '2026-10-03T12:00:00Z' })

  const result = await getForecast(createDb(d1), USER_ID)

  assert.equal(result.daysElapsed, 15)
  assert.equal(result.dailyAverage, 2_000)
  // The 30,000 went on the credit card, so the accounts still hold 110,000 today (design D16);
  // each of the 16 days after it takes 2,000.
  assert.equal(result.days[0]?.balance, 110_000)
  assert.equal(result.days.at(-1)?.balance, 110_000 - 2_000 * 16)
})

test("a fixed bill's movement is not part of the pace", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  seedRent(sqlite, '2026-10-20')
  seedExpense(sqlite, { id: 'rent-paid', cents: 3_000_000, occurredAt: '2026-10-03T12:00:00Z', recurringExpenseId: 'rent-1' })

  const result = await getForecast(createDb(d1), USER_ID)

  assert.equal(result.dailyAverage, 0)
})

test("another user's spending is not part of the pace", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  seedOtherUser(sqlite)
  seedExpense(sqlite, { id: 'ben-food', userId: 'user-2', cardId: 'card-2', cents: 3_000_000, occurredAt: '2026-10-03T12:00:00Z' })

  const result = await getForecast(createDb(d1), USER_ID)

  assert.equal(result.dailyAverage, 0)
})

test('a spread expense counts its share of this month in the pace', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  // 60,000 bought on the 15th of September, spread over six months: October holds 10,000 of it.
  seedExpense(sqlite, { id: 'spread-1', cents: 6_000_000, installmentMonths: 6, occurredAt: '2026-09-15T12:00:00Z' })

  const result = await getForecast(createDb(d1), USER_ID)

  // 10,000 over the 15 days elapsed, rounded down to the cent.
  assert.equal(result.dailyAverage, 666.66)
})

test('an expense in another currency is not part of the pace', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  seedExpense(sqlite, { id: 'usd-1', cents: 3_000_000, currency: 'USD', occurredAt: '2026-10-03T12:00:00Z' })

  const result = await getForecast(createDb(d1), USER_ID)

  assert.equal(result.dailyAverage, 0)
})

test("a card statement leaves on its payment day, and the card's debt never moves the line", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  // 4,000 still asked for by the statement, due on the 20th. The debt itself is far larger.
  sqlite.exec(`
    INSERT INTO balance_adjustment (id, user_id, card_id, currency, observed_balance_cents, delta_cents, adjusted_at, created_at) VALUES ('debt-1', 'user-1', 'card-1', 'COP', 500000000, 500000000, ${Date.parse('2026-10-01T12:00:00Z')}, 1);
    INSERT INTO card_statement (id, user_id, card_id, closed_on, due_on, payment_cents, created_at) VALUES ('statement-1', 'user-1', 'card-1', '2026-09-30', '2026-10-20', 400000, 1);
  `)

  const result = await getForecast(createDb(d1), USER_ID)

  const before = result.days.filter((point) => point.day < '2026-10-20')
  const from = result.days.filter((point) => point.day >= '2026-10-20')
  assert.ok(before.every((point) => point.balance === 10_000))
  assert.ok(from.every((point) => point.balance === 6_000))
})

test('the month so far is what the accounts held at the end of each day, ending with today', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedBalance(sqlite)
  // A card charge never moves the accounts, so it is not in the history.
  seedExpense(sqlite, { id: 'food-1', cents: 300_000, occurredAt: '2026-10-05T12:00:00Z' })
  // Late on the 9th in Bogota (UTC-5), early on the 10th in UTC: it belongs to the 9th.
  sqlite.exec(`INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('rent-paid', 'user-1', 'expense', 400000, 'COP', 'product-1', 'category-1', ${Date.parse('2026-10-10T03:00:00Z')}, 1);`)

  const result = await getForecast(createDb(d1), USER_ID)

  assert.equal(result.history.length, 15)
  assert.deepEqual(result.history[0], { day: '2026-10-01', balance: 0 })
  assert.deepEqual(result.history[1], { day: '2026-10-02', balance: 10_000 })
  assert.deepEqual(result.history[7], { day: '2026-10-08', balance: 10_000 })
  assert.deepEqual(result.history[8], { day: '2026-10-09', balance: 6_000 })
  // Today's point is where the projection starts.
  assert.deepEqual(result.history.at(-1), { day: '2026-10-15', balance: 6_000 })
  assert.equal(result.days[0]?.balance, 6_000)
})
