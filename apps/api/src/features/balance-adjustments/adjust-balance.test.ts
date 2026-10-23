import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { adjustBalance } = await import('./adjust-balance.ts')

// The instant the balance is read and the adjustment is written: the same for every call in a test.
beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T15:00:00Z') }))
afterEach(() => mock.timers.reset())

const source = { type: 'product', id: 'product-1' } as const

const adjustmentRows = (sqlite: DatabaseSync) =>
  sqlite.prepare('SELECT delta_cents AS delta, observed_balance_cents AS observed FROM balance_adjustment').all().map((row) => ({ ...row }))

test('a correction writes one adjustment and returns its difference', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const db = createDb(d1)

  // The account reads 0 and the user sees 0; the real balance is 150.
  const result = await adjustBalance(db, USER_ID, { source, observedBalance: 150, expectedBalance: 0 })

  assert.deepEqual(result, { delta: 150, balance: 150 })
  assert.deepEqual(adjustmentRows(sqlite), [{ delta: 15_000, observed: 15_000 }])
})

test('a second correction against the balance the user saw before the first is refused', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const db = createDb(d1)
  await adjustBalance(db, USER_ID, { source, observedBalance: 150, expectedBalance: 0 })

  await assert.rejects(adjustBalance(db, USER_ID, { source, observedBalance: 200, expectedBalance: 0 }), {
    code: 'balance_changed',
    status: 409,
  })
  assert.deepEqual(adjustmentRows(sqlite), [{ delta: 15_000, observed: 15_000 }])
})

test('two corrections that read the same balance write one adjustment, not two', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const db = createDb(d1)

  // Both read 0 before either writes: the claim statement lets only the first insert a row.
  const outcomes = await Promise.allSettled([
    adjustBalance(db, USER_ID, { source, observedBalance: 150, expectedBalance: 0 }),
    adjustBalance(db, USER_ID, { source, observedBalance: 150, expectedBalance: 0 }),
  ])

  assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), ['fulfilled', 'rejected'])
  const refused = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
  assert.equal(refused?.reason.code, 'balance_changed')
  assert.equal(refused?.reason.status, 409)
  assert.deepEqual(adjustmentRows(sqlite), [{ delta: 15_000, observed: 15_000 }])
})

const cardSource = { type: 'card', id: 'card-1' } as const

test('a debt in a currency the user never enabled is refused, and no adjustment is written', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  // Only the primary currency is enabled; a USD debt on the card is not.
  sqlite.exec(`INSERT INTO user_currency (user_id, code, created_at) VALUES ('user-1', 'COP', 1)`)

  await assert.rejects(
    adjustBalance(createDb(d1), USER_ID, { source: cardSource, observedBalance: 150, currency: 'USD' }),
    { code: 'currency_not_enabled', status: 400 },
  )
  assert.deepEqual(adjustmentRows(sqlite), [])
})

test('a debt in a currency the user enabled is adjusted in that currency', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.exec(`INSERT INTO user_currency (user_id, code, created_at) VALUES ('user-1', 'COP', 1), ('user-1', 'USD', 1)`)

  const result = await adjustBalance(createDb(d1), USER_ID, { source: cardSource, observedBalance: 150, currency: 'USD' })

  assert.deepEqual(result, { delta: 150, balance: 150 })
  assert.deepEqual(
    sqlite.prepare('SELECT currency, delta_cents AS delta FROM balance_adjustment').all().map((row) => ({ ...row })),
    [{ currency: 'USD', delta: 15_000 }],
  )
})
