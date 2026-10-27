import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { getSafeToSpend } = await import('./get-safe-to-spend.ts')

// Mid-October in Bogota: the month and the day the spend is measured on are the ones of this instant.
const pinClock = () => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T15:00:00Z') })
afterEach(() => mock.timers.reset())

/**
 * A USD charge on a COP card stores both amounts; the month spend counts the COP one, like the
 * card's debt. The cap equals that COP value, so the charge uses it up exactly: a daily cap of zero
 * proves the month spend holds 40,000,000 (and neither the 10,000 USD nor nothing).
 */
test('a foreign charge counts its value in the card currency', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite, 40_000_000)
  // The first of the month at noon UTC: inside the month on the user's clock.
  const occurredAt = new Date('2026-10-01T12:00:00Z')
  sqlite
    .prepare(
      `INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, primary_amount_cents, category_id, occurred_at, created_at) VALUES ('charge', ?, 'expense', 10000, 'USD', 'card-1', 40000000, 'category-1', ?, 1)`,
    )
    .run(USER_ID, occurredAt.getTime())

  const result = await getSafeToSpend(createDb(d1), USER_ID)
  assert.equal(result.currency, 'COP')
  assert.equal(result.target, 400_000)
  assert.equal(result.targetDaily, 0)
})

/** Another user with money in every place the query reads: balances, a bill, a goal, a spread expense. */
const seedOtherUser = (sqlite: DatabaseSync) =>
  sqlite.exec(`
    INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1);
    INSERT INTO user_settings (user_id, country, locale, timezone, primary_currency, spending_target_cents, onboarded_at) VALUES ('user-2', 'CO', 'en', 'America/Bogota', 'COP', 500000, 1);
    INSERT INTO bank (id, user_id, name, created_at) VALUES ('bank-2', 'user-2', 'Bank', 1);
    INSERT INTO bank_account (id, user_id, bank_id, name, created_at) VALUES ('account-2', 'user-2', 'bank-2', 'Checking', 1);
    INSERT INTO product (id, user_id, bank_account_id, type, name, currency, created_at) VALUES ('product-2', 'user-2', 'account-2', 'checking', 'Card', 'COP', 1);
    INSERT INTO card (id, user_id, product_id, kind, name, created_at) VALUES ('card-2', 'user-2', 'product-2', 'credit', 'Visa', 1);
    INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-2', 'user-2', 'Food', 'expense', 1);
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('income-2', 'user-2', 'income', 100000000, 'COP', 'product-2', 'category-2', ${Date.parse('2026-10-02T12:00:00Z')}, 1);
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, installment_months, occurred_at, created_at) VALUES ('spread-2', 'user-2', 'expense', 60000000, 'COP', 'card-2', 'category-2', 6, ${Date.parse('2026-10-04T12:00:00Z')}, 1);
    INSERT INTO balance_adjustment (id, user_id, product_id, currency, observed_balance_cents, delta_cents, adjusted_at, created_at) VALUES ('adjust-2', 'user-2', 'product-2', 'COP', 1050000, 50000, 1, 1);
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('rent-2', 'user-2', 'Rent', 50000000, 'COP', 'card-2', 'category-2', 'monthly', '2026-09-20', '2026-10-20', 1, 1);
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('insurance-2', 'user-2', 'Insurance', 120000000, 'COP', 'card-2', 'category-2', 'yearly', '2026-03-01', '2027-03-01', 1, 1);
    INSERT INTO savings_goal (id, user_id, name, target_cents, currency, target_date, active, created_at) VALUES ('goal-2', 'user-2', 'Trip', 100000000, 'COP', NULL, 1, 1);
    INSERT INTO savings_contribution (id, user_id, goal_id, amount_cents, contributed_on, created_at) VALUES ('contribution-2', 'user-2', 'goal-2', 20000000, '2026-10-01', 1);
  `)

test("another user's balances, bills, goals and expenses do not change the result", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite, 1_000_000)
  sqlite.exec(`
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('income-1', 'user-1', 'income', 200000000, 'COP', 'product-1', 'category-1', ${Date.parse('2026-10-02T12:00:00Z')}, 1);
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('expense-1', 'user-1', 'expense', 10000000, 'COP', 'card-1', 'category-1', ${Date.parse('2026-10-03T12:00:00Z')}, 1);
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('rent-1', 'user-1', 'Rent', 30000000, 'COP', 'card-1', 'category-1', 'monthly', '2026-09-25', '2026-10-25', 1, 1);
  `)
  const db = createDb(d1)
  const before = await getSafeToSpend(db, USER_ID)

  seedOtherUser(sqlite)

  // The other user's own result moves, so the data is live: only the scoping keeps it out of this one.
  assert.notDeepEqual(await getSafeToSpend(db, 'user-2'), before)
  assert.deepEqual(await getSafeToSpend(db, USER_ID), before)
})

test('a savings goal holds back what it has plus what this month\'s share still lacks', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.exec(`
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('income-1', 'user-1', 'income', 2000000, 'COP', 'product-1', 'category-1', ${Date.parse('2026-10-02T12:00:00Z')}, 1);
  `)
  const db = createDb(d1)
  const before = await getSafeToSpend(db, USER_ID)

  // A 30,000 COP car by December: 10,000 a month for three months, starting this one.
  sqlite.exec(`
    INSERT INTO savings_goal (id, user_id, name, target_cents, currency, target_date, active, created_at) VALUES ('goal-1', 'user-1', 'Car', 3000000, 'COP', '2026-12-31', 1, 1);
  `)
  const planned = await getSafeToSpend(db, USER_ID)
  // 7,500 of this month's 10,000 is saved: 2,500 is still due, and the month does not ask again.
  sqlite.exec(`
    INSERT INTO savings_contribution (id, user_id, goal_id, amount_cents, contributed_on, created_at) VALUES ('contribution-1', 'user-1', 'goal-1', 750000, '2026-10-01', 1);
  `)
  const saved = await getSafeToSpend(db, USER_ID)
  // Saved before this month, the 7,500 is held and the month asks for its share of the 22,500 left.
  sqlite.exec(`UPDATE savings_contribution SET contributed_on = '2026-09-20' WHERE id = 'contribution-1'`)
  const savedBefore = await getSafeToSpend(db, USER_ID)

  assert.equal(before.setAsides, 0)
  assert.equal(planned.setAsides, 10_000)
  assert.equal(saved.setAsides, 10_000)
  assert.equal(saved.free, before.free - 10_000)
  assert.equal(savedBefore.setAsides, 15_000)
})

test('a savings goal that reached its target holds nothing back', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const db = createDb(d1)
  const before = await getSafeToSpend(db, USER_ID)

  // A 30,000 COP goal, fully saved this month: the money is in the accounts and free to spend.
  sqlite.exec(`
    INSERT INTO savings_goal (id, user_id, name, target_cents, currency, target_date, active, created_at) VALUES ('goal-1', 'user-1', 'Car', 3000000, 'COP', '2026-12-31', 1, 1);
    INSERT INTO savings_contribution (id, user_id, goal_id, amount_cents, contributed_on, created_at) VALUES ('contribution-1', 'user-1', 'goal-1', 3000000, '2026-10-01', 1);
  `)
  const reached = await getSafeToSpend(db, USER_ID)

  assert.equal(reached.setAsides, 0)
  assert.equal(reached.free, before.free)
})

test('an overdue monthly bill is counted once in the pending bills', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  // Due on the 5th, still unpaid on the 15th: it takes its money today, once.
  sqlite.exec(`
    INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('rent-1', 'user-1', 'Rent', 1500000, 'COP', 'card-1', 'category-1', 'monthly', '2026-08-05', '2026-10-05', 1, 1);
  `)

  const result = await getSafeToSpend(createDb(d1), USER_ID)

  assert.equal(result.pendingBills, 15_000)
})

test("a card's debt does not weigh; its statement does, when it is paid in the period", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  // 100,000 in the account and 50,000 charged to the card.
  sqlite.exec(`
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, product_id, category_id, occurred_at, created_at) VALUES ('income-1', 'user-1', 'income', 10000000, 'COP', 'product-1', 'category-1', ${Date.parse('2026-10-02T12:00:00Z')}, 1);
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('charge-1', 'user-1', 'expense', 5000000, 'COP', 'card-1', 'category-1', ${Date.parse('2026-10-03T12:00:00Z')}, 1);
  `)
  const db = createDb(d1)
  const debtOnly = await getSafeToSpend(db, USER_ID)

  // A statement of 20,000 due on the 20th, inside the month.
  sqlite.exec(`INSERT INTO card_statement (id, user_id, card_id, closed_on, due_on, payment_cents, created_at) VALUES ('statement-1', 'user-1', 'card-1', '2026-09-30', '2026-10-20', 2000000, 1)`)
  const dueNow = await getSafeToSpend(db, USER_ID)

  // The same statement paid next month: not this period's money.
  sqlite.exec(`UPDATE card_statement SET due_on = '2026-11-14'`)
  const dueLater = await getSafeToSpend(db, USER_ID)

  assert.equal(debtOnly.available, 100_000)
  assert.equal(debtOnly.cardPayments, 0)
  assert.equal(debtOnly.free, 100_000)
  assert.equal(dueNow.cardPayments, 20_000)
  assert.equal(dueNow.free, 80_000)
  assert.equal(dueNow.cards[0]?.statement?.remaining, 20_000)
  assert.equal(dueLater.cardPayments, 0)
  assert.equal(dueLater.free, 100_000)
})

test('a spread charge on a credit card gives nothing back: its statement asks for it', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.exec(`
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, installment_months, occurred_at, created_at) VALUES ('spread-1', 'user-1', 'expense', 6000000, 'COP', 'card-1', 'category-1', 6, ${Date.parse('2026-10-04T12:00:00Z')}, 1);
  `)

  const result = await getSafeToSpend(createDb(d1), USER_ID)

  assert.equal(result.futureInstallments, 0)
  assert.equal(result.free, 0)
})
