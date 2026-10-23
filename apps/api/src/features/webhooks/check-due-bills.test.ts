import assert from 'node:assert/strict'
import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import '../../test/ts-imports.ts'
import { signBody } from './webhook-signature.ts'

const { createDb } = await import('../../db.ts')
const { checkDueBills } = await import('./check-due-bills.ts')

const USER = 'user-1'
const OTHER = 'user-2'
const TIMEZONE = 'America/Bogota'
const SECRET = 'shhh-secret-value'
const HOOK_A = 'https://hook-a.example.com/dqfinance'
const HOOK_B = 'https://hook-b.example.com/dqfinance'
// 10:00 in Bogotá on 15 October: the check's "today" is 2026-10-15.
const PINNED = '2026-10-15T15:00:00Z'
const PINNED_UNIX = Date.parse(PINNED) / 1000

const pinClock = () => mock.timers.enable({ apis: ['Date'], now: new Date(PINNED) })

const originalFetch = globalThis.fetch
afterEach(() => {
  mock.timers.reset()
  globalThis.fetch = originalFetch
})

type Call = { url: string; init: RequestInit }

/** Replaces fetch: each receiver answers with the status `answer` gives for its URL. */
const stubFetch = (answer: (url: string) => number) => {
  const calls: Call[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    return new Response(null, { status: answer(String(input)) })
  }) as typeof fetch
  return calls
}

/** A user with the ledger a bill needs. Ids carry the user, so two users share one database. */
const seedUser = (sqlite: DatabaseSync, userId: string, { anonymous = false, leadDays = 3 }: { anonymous?: boolean; leadDays?: number | null } = {}) => {
  const run = (sql: string, ...params: SQLInputValue[]) => sqlite.prepare(sql).run(...params)
  run(
    `INSERT INTO user (id, name, email, email_verified, is_anonymous, created_at, updated_at) VALUES (?, ?, ?, 0, ?, 1, 1)`,
    userId,
    userId,
    `${userId}@example.test`,
    anonymous ? 1 : 0,
  )
  run(
    `INSERT INTO user_settings (user_id, country, locale, timezone, primary_currency, spending_target_cents, onboarded_at, reminder_lead_days) VALUES (?, 'CO', 'en', ?, 'COP', NULL, 1, ?)`,
    userId,
    TIMEZONE,
    leadDays,
  )
  run(`INSERT INTO bank (id, user_id, name, created_at) VALUES (?, ?, 'Bank', 1)`, `bank-${userId}`, userId)
  run(
    `INSERT INTO bank_account (id, user_id, bank_id, name, created_at) VALUES (?, ?, ?, 'Checking', 1)`,
    `account-${userId}`,
    userId,
    `bank-${userId}`,
  )
  run(
    `INSERT INTO product (id, user_id, bank_account_id, type, name, currency, created_at) VALUES (?, ?, ?, 'checking', 'Card', 'COP', 1)`,
    `product-${userId}`,
    userId,
    `account-${userId}`,
  )
  run(
    `INSERT INTO card (id, user_id, product_id, kind, name, created_at) VALUES (?, ?, ?, 'credit', 'Visa', 1)`,
    `card-${userId}`,
    userId,
    `product-${userId}`,
  )
  run(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES (?, ?, 'Food', 'expense', 1)`, `category-${userId}`, userId)
}

const addHook = (sqlite: DatabaseSync, id: string, userId: string, url: string, active = 1) =>
  sqlite
    .prepare(`INSERT INTO webhook (id, user_id, url, secret, active, created_at) VALUES (?, ?, ?, ?, ?, 1)`)
    .run(id, userId, url, SECRET, active)

const addBill = (sqlite: DatabaseSync, id: string, userId: string, nextDueOn: string) =>
  sqlite
    .prepare(
      `INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES (?, ?, 'Gym', 5000000, 'COP', ?, ?, 'monthly', ?, ?, 1, 1)`,
    )
    .run(id, userId, `card-${userId}`, `category-${userId}`, nextDueOn, nextDueOn)

const notifiedOn = (sqlite: DatabaseSync, billId: string) =>
  (sqlite.prepare('SELECT notified_on AS notifiedOn FROM recurring_expense WHERE id = ?').get(billId) as { notifiedOn: string | null })
    .notifiedOn

const deliveryHeaders = (call: Call) => call.init.headers as Record<string, string>

test('a bill due inside the lead days is announced once, and the next check calls nothing', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  addHook(sqlite, 'hook-a', USER, HOOK_A)
  addBill(sqlite, 'bill-1', USER, '2026-10-17') // two days out, inside the three-day lead
  const calls = stubFetch(() => 200)

  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 1, delivered: 1, failures: [] })
  assert.equal(calls.length, 1)
  const call = calls[0]!
  assert.equal(call.url, HOOK_A)
  const headers = deliveryHeaders(call)
  assert.equal(headers['X-DQFinance-Event'], 'bill.due')
  assert.equal(headers['X-DQFinance-Delivery'], 'bill-1:2026-10-17')
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(headers['X-DQFinance-Signature'] ?? '')
  assert.ok(match, 'the signature header is t=<digits>,v1=<64 hex>')
  assert.equal(match[1], String(PINNED_UNIX), 'the signed time is the pinned clock')
  const body = String(call.init.body)
  assert.equal(match[2], await signBody(SECRET, `${match[1]}.${body}`))
  assert.deepEqual(JSON.parse(body).bill, { id: 'bill-1', name: 'Gym', amount: 50000, currency: 'COP', dueOn: '2026-10-17' })
  assert.equal(notifiedOn(sqlite, 'bill-1'), '2026-10-17')

  calls.length = 0
  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 0, delivered: 0, failures: [] })
  assert.equal(calls.length, 0)
})

test('an overdue bill is announced, and a bill past the lead days waits for its window', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  addHook(sqlite, 'hook-a', USER, HOOK_A)
  addBill(sqlite, 'overdue', USER, '2026-10-10') // fell due while the app was closed
  addBill(sqlite, 'later', USER, '2026-10-19') // four days out, one past the three-day lead
  const calls = stubFetch(() => 200)

  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 1, delivered: 1, failures: [] })
  assert.equal(calls.length, 1)
  assert.equal(deliveryHeaders(calls[0]!)['X-DQFinance-Delivery'], 'overdue:2026-10-10')
  assert.equal(notifiedOn(sqlite, 'overdue'), '2026-10-10')
  assert.equal(notifiedOn(sqlite, 'later'), null)
})

test('a bill whose hook answered 500 stays unannounced, and the next check announces it', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  addHook(sqlite, 'hook-a', USER, HOOK_A)
  addBill(sqlite, 'bill-1', USER, '2026-10-17')
  let status = 500
  const calls = stubFetch(() => status)

  assert.deepEqual(await checkDueBills(createDb(d1), USER), {
    bills: 1,
    delivered: 0,
    failures: [`${HOOK_A}: the endpoint answered 500`],
  })
  assert.equal(notifiedOn(sqlite, 'bill-1'), null)

  status = 200
  calls.length = 0
  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 1, delivered: 1, failures: [] })
  assert.equal(calls.length, 1)
  assert.equal(notifiedOn(sqlite, 'bill-1'), '2026-10-17')
})

test('a bill is not marked while one of two hooks failed, and the retry calls both with the same delivery id', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  addHook(sqlite, 'hook-a', USER, HOOK_A)
  addHook(sqlite, 'hook-b', USER, HOOK_B)
  addBill(sqlite, 'bill-1', USER, '2026-10-17')
  let statusB = 500
  const calls = stubFetch((url) => (url === HOOK_B ? statusB : 200))

  assert.deepEqual(await checkDueBills(createDb(d1), USER), {
    bills: 1,
    delivered: 1,
    failures: [`${HOOK_B}: the endpoint answered 500`],
  })
  assert.equal(notifiedOn(sqlite, 'bill-1'), null)

  statusB = 200
  calls.length = 0
  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 1, delivered: 2, failures: [] })
  assert.deepEqual(calls.map((call) => call.url).sort(), [HOOK_A, HOOK_B])
  assert.deepEqual(
    calls.map((call) => deliveryHeaders(call)['X-DQFinance-Delivery']),
    ['bill-1:2026-10-17', 'bill-1:2026-10-17'],
  )
  assert.equal(notifiedOn(sqlite, 'bill-1'), '2026-10-17')
})

test('with no active hook the bill stays open, so a hook added later receives it', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  addHook(sqlite, 'hook-a', USER, HOOK_A, 0)
  addBill(sqlite, 'bill-1', USER, '2026-10-17')
  const calls = stubFetch(() => 200)

  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 1, delivered: 0, failures: [] })
  assert.equal(calls.length, 0)
  assert.equal(notifiedOn(sqlite, 'bill-1'), null)

  sqlite.prepare('UPDATE webhook SET active = 1').run()
  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 1, delivered: 1, failures: [] })
  assert.equal(notifiedOn(sqlite, 'bill-1'), '2026-10-17')
})

test("another user's bill is never announced to this user's hook, and another user's hook is never called", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  seedUser(sqlite, OTHER)
  addHook(sqlite, 'hook-a', USER, HOOK_A)
  addHook(sqlite, 'hook-b', OTHER, HOOK_B)
  addBill(sqlite, 'bill-other', OTHER, '2026-10-17')
  const calls = stubFetch(() => 200)

  assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 0, delivered: 0, failures: [] })
  assert.equal(calls.length, 0)
  assert.equal(notifiedOn(sqlite, 'bill-other'), null)

  // The owner's own check announces the same bill, so the case above does not pass for want of a due bill.
  assert.deepEqual(await checkDueBills(createDb(d1), OTHER), { bills: 1, delivered: 1, failures: [] })
  assert.deepEqual(
    calls.map((call) => call.url),
    [HOOK_B],
  )
})

test('a guest is refused, and no hook is called', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, 'guest-1', { anonymous: true })
  addHook(sqlite, 'hook-a', 'guest-1', HOOK_A)
  addBill(sqlite, 'bill-1', 'guest-1', '2026-10-17')
  const calls = stubFetch(() => 200)

  await assert.rejects(checkDueBills(createDb(d1), 'guest-1'), { code: 'guest_not_allowed', status: 403 })
  assert.equal(calls.length, 0)
  assert.equal(notifiedOn(sqlite, 'bill-1'), null)
})

test('with no reminder, or a reminder of zero days, no hook is called', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedUser(sqlite, USER)
  addHook(sqlite, 'hook-a', USER, HOOK_A)
  addBill(sqlite, 'bill-1', USER, '2026-10-15') // due today: inside any window a reminder would open
  const calls = stubFetch(() => 200)

  for (const leadDays of [null, 0]) {
    sqlite.prepare('UPDATE user_settings SET reminder_lead_days = ? WHERE user_id = ?').run(leadDays, USER)
    assert.deepEqual(await checkDueBills(createDb(d1), USER), { bills: 0, delivered: 0, failures: [] }, `lead days ${leadDays}`)
  }
  assert.equal(calls.length, 0)
  assert.equal(notifiedOn(sqlite, 'bill-1'), null)
})
