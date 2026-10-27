import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, TIMEZONE, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { recordCardStatement } = await import('./record-card-statement.ts')
const { listCardCycles } = await import('./list-card-cycles.ts')

// Mid-October in Bogota. The card cuts on the 30th and is paid on the 20th: the last cut is
// September 30th and its payment falls on October 20th.
const pinClock = () => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T15:00:00Z') })
afterEach(() => mock.timers.reset())

const seed = (sqlite: DatabaseSync) => {
  seedCardUser(sqlite)
  sqlite.exec(`UPDATE card SET statement_day = 30, due_day = 20 WHERE id = 'card-1'`)
}

// A payment of `cents` from the checking product that reached the card at `receivedAt`.
const seedPayment = (sqlite: DatabaseSync, id: string, cents: number, receivedAt: string) =>
  sqlite
    .prepare(
      `INSERT INTO transfer (id, user_id, from_product_id, to_card_id, sent_amount_cents, sent_currency, received_amount_cents, received_currency, sent_at, received_at, created_at) VALUES (?, ?, 'product-1', 'card-1', ?, 'COP', ?, 'COP', ?, ?, 1)`,
    )
    .run(id, USER_ID, cents, cents, Date.parse(receivedAt), Date.parse(receivedAt))

test("a statement defaults to the card's last cut and the payment day after it", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)

  const recorded = await recordCardStatement(createDb(d1), USER_ID, { cardId: 'card-1', payment: 412_300 })

  assert.deepEqual(
    { closedOn: recorded.closedOn, dueOn: recorded.dueOn, payment: recorded.payment, currency: recorded.currency },
    { closedOn: '2026-09-30', dueOn: '2026-10-20', payment: 412_300, currency: 'COP' },
  )
})

test('recording the same cut again replaces its payment', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)

  await recordCardStatement(db, USER_ID, { cardId: 'card-1', payment: 100 })
  await recordCardStatement(db, USER_ID, { cardId: 'card-1', payment: 250 })

  const rows = sqlite.prepare(`SELECT payment_cents FROM card_statement`).all()
  assert.deepEqual(rows.map((row) => row.payment_cents), [25_000])
})

test('a card without its days needs the dates, and a debit card has no statement', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const db = createDb(d1)

  await assert.rejects(recordCardStatement(db, USER_ID, { cardId: 'card-1', payment: 100 }), { code: 'statement_dates_required' })
  const dated = await recordCardStatement(db, USER_ID, {
    cardId: 'card-1',
    payment: 100,
    closedOn: '2026-09-30',
    dueOn: '2026-10-14',
  })
  assert.equal(dated.dueOn, '2026-10-14')

  sqlite.exec(`UPDATE card SET kind = 'debit' WHERE id = 'card-1'`)
  await assert.rejects(recordCardStatement(db, USER_ID, { cardId: 'card-1', payment: 100 }), { code: 'credit_card_required' })
})

test("another user's card is not found", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)

  await assert.rejects(recordCardStatement(createDb(d1), 'user-2', { cardId: 'card-1', payment: 100 }), {
    code: 'source_not_found',
  })
})

test('a payment after the cut lowers what the statement asks for; one before it does not', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)
  await recordCardStatement(db, USER_ID, { cardId: 'card-1', payment: 400_000 })
  // Before the cut: the bank already counted it in the statement.
  seedPayment(sqlite, 'before', 5_000_000, '2026-09-30T20:00:00Z')
  // The day after the cut, on the user's clock.
  seedPayment(sqlite, 'after', 15_000_000, '2026-10-01T06:00:00Z')

  const [cycle] = await listCardCycles(db, USER_ID, '2026-10-15', TIMEZONE)

  assert.deepEqual(cycle?.statement, {
    closedOn: '2026-09-30',
    dueOn: '2026-10-20',
    paymentCents: 40_000_000,
    paidCents: 15_000_000,
    remainingCents: 25_000_000,
  })
  assert.equal(cycle?.statementMissing, false)
})

test('the cycle holds the charges since the last cut, and asks for a missing statement', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  sqlite.exec(`
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('old', 'user-1', 'expense', 900000, 'COP', 'card-1', 'category-1', ${Date.parse('2026-09-30T20:00:00Z')}, 1);
    INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, occurred_at, created_at) VALUES ('new', 'user-1', 'expense', 300000, 'COP', 'card-1', 'category-1', ${Date.parse('2026-10-03T12:00:00Z')}, 1);
  `)

  const [cycle] = await listCardCycles(createDb(d1), USER_ID, '2026-10-15', TIMEZONE)

  assert.equal(cycle?.lastCutOn, '2026-09-30')
  assert.equal(cycle?.dueOn, '2026-10-20')
  assert.equal(cycle?.cycleChargesCents, 300_000)
  assert.equal(cycle?.statement, null)
  assert.equal(cycle?.statementMissing, true)
})
