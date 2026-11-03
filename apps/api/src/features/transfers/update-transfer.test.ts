import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Hono } from 'hono'
import type { AppEnv } from '../../app-env.ts'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { onError } = await import('../../shared/http.ts')
const { createTransfer } = await import('./create-transfer.ts')
const { updateTransfer } = await import('./update-transfer.ts')
const { transfersRoutes } = await import('./transfers.routes.ts')
const { markTransferReceived } = await import('./mark-transfer-received.ts')
const { listTransfers } = await import('./list-transfers.ts')
const { getBalances } = await import('../balances/get-balances.ts')
const { createTransaction } = await import('../transactions/create-transaction.ts')

const seed = (sqlite: DatabaseSync) => {
  seedCardUser(sqlite)
  sqlite.exec(`INSERT INTO cash_wallet (id, user_id, name, currency, created_at) VALUES ('wallet-1', '${USER_ID}', 'Cash', 'COP', 1)`)
  sqlite.exec(`INSERT INTO cash_wallet (id, user_id, name, currency, created_at) VALUES ('wallet-2', '${USER_ID}', 'Other cash', 'COP', 1)`)
  sqlite.exec(
    `INSERT INTO product (id, user_id, bank_account_id, type, name, currency, created_at) VALUES ('product-usd', '${USER_ID}', 'account-1', 'checking', 'US', 'USD', 1)`,
  )
  sqlite.exec(`INSERT INTO user_currency (user_id, code, created_at) VALUES ('${USER_ID}', 'USD', 1)`)
}

const setup = () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  return { sqlite, db: createDb(d1) }
}

const balancesOf = async (db: ReturnType<typeof createDb>, ref = 'wallet-1') => {
  const balances = await getBalances(db, USER_ID)
  return {
    origin: balances.accounts.find((a) => a.ref.id === 'product-1')?.balanceCents,
    destination: balances.accounts.find((a) => a.ref.id === ref)?.balanceCents,
    debts: balances.creditCards.find((c) => c.ref.id === 'card-1')?.debts,
  }
}

test('an empty edit leaves the transfer, its fee entry and the balances alone', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
    note: 'To cash',
  })
  const before = { balances: await balancesOf(db), listed: await listTransfers(db, USER_ID, {}) }

  await updateTransfer(db, USER_ID, id, {})

  assert.deepEqual({ balances: await balancesOf(db), listed: await listTransfers(db, USER_ID, {}) }, before)
})

test('a new amount is what both balances count, and the fee follows it', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
  })

  await updateTransfer(db, USER_ID, id, { amount: 300 })

  assert.deepEqual(await balancesOf(db), { origin: -30_500, destination: 30_000, debts: [] })
  const [listed] = await listTransfers(db, USER_ID, {})
  assert.deepEqual({ sentAmount: listed?.sentAmount, fee: listed?.fee }, { sentAmount: 300, fee: 5 })
})

test('a new destination moves the money, and a removed fee stops counting', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
  })

  await updateTransfer(db, USER_ID, id, { to: { type: 'cash_wallet', id: 'wallet-2' }, fee: null })

  assert.deepEqual(await balancesOf(db, 'wallet-2'), { origin: -10_000, destination: 10_000, debts: [] })
  assert.equal((await balancesOf(db, 'wallet-1')).destination, 0)
})

test('editing an in-transit transfer keeps the day it arrived', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    sentAt: '2026-10-01T12:00:00.000Z',
    inTransit: true,
  })
  await markTransferReceived(db, USER_ID, { id, receivedAt: '2026-10-03T15:00:00.000Z' })

  await updateTransfer(db, USER_ID, id, { note: 'Corrected' })

  const [listed] = await listTransfers(db, USER_ID, {})
  assert.equal(listed?.sentAt, '2026-10-01T12:00:00.000Z')
  assert.equal(listed?.receivedAt, '2026-10-03T15:00:00.000Z')
  assert.equal(listed?.note, 'Corrected')
})

test('paying foreign card debt recomputes the cost basis from before the old payment', async () => {
  const { db } = setup()
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 25,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 1000,
    categoryId: 'category-1',
  })
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'card', id: 'card-1' },
    amount: 1200,
    receivedAmount: 25,
    debtCurrency: 'USD',
    fee: 3,
  })
  assert.deepEqual(await balancesOf(db), { origin: -120_300, destination: 0, debts: [] })

  await updateTransfer(db, USER_ID, id, { amount: 1000, receivedAmount: 20 })

  // 20 of the 25 dollars paid at 800 the unit; the rest of the debt keeps its purchase-day value.
  assert.deepEqual(await balancesOf(db), {
    origin: -100_300,
    destination: 0,
    debts: [{ currency: 'USD', amountCents: 500, costBasisCents: 20_000 }],
  })
})

test('a note edit leaves the cost basis of an earlier card payment alone', async () => {
  const { sqlite, db } = setup()
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 100,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 400_000,
    categoryId: 'category-1',
  })
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'card', id: 'card-1' },
    amount: 340_000,
    receivedAmount: 90,
    debtCurrency: 'USD',
    fee: 2,
    sentAt: '2026-10-01T12:00:00.000Z',
  })
  // A charge made after the payment: the payment answered the debt of its own day, not this one.
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 90,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 450_000,
    categoryId: 'category-1',
  })
  const before = { balances: await balancesOf(db), listed: await listTransfers(db, USER_ID, {}) }
  const linkedRows = () => sqlite.prepare('SELECT id FROM `transaction` WHERE transfer_id = ?').all(id)

  await updateTransfer(db, USER_ID, id, { note: 'Corrected' })

  assert.deepEqual(await balancesOf(db), before.balances)
  assert.equal((await listTransfers(db, USER_ID, {}))[0]?.fxDifference, before.listed[0]?.fxDifference)
  assert.equal((await listTransfers(db, USER_ID, {}))[0]?.note, 'Corrected')
  assert.equal(linkedRows().length, 2)
})

test('a new destination in another currency asks for the arrived amount', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 1000,
  })

  await assert.rejects(updateTransfer(db, USER_ID, id, { to: { type: 'product', id: 'product-usd' } }), {
    code: 'received_amount_required',
  })
  assert.equal((await balancesOf(db)).destination, 100_000)

  await updateTransfer(db, USER_ID, id, { to: { type: 'product', id: 'product-usd' }, receivedAmount: 0.25 })

  const usd = (await getBalances(db, USER_ID)).accounts.find((a) => a.ref.id === 'product-usd')
  assert.equal(usd?.balanceCents, 25)
  assert.equal((await balancesOf(db)).destination, 0)
})

test('a new origin in another currency asks for the amount', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 1000,
  })

  await assert.rejects(updateTransfer(db, USER_ID, id, { from: { type: 'product', id: 'product-usd' } }), {
    code: 'amount_required',
  })
  assert.equal((await balancesOf(db)).destination, 100_000)
})

test('an origin in another currency does not re-denominate the old fee', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 1000,
    fee: 5,
    sentAt: '2026-10-01T12:00:00.000Z',
  })

  await updateTransfer(db, USER_ID, id, { from: { type: 'product', id: 'product-usd' }, amount: 50 })

  const usd = (await getBalances(db, USER_ID)).accounts.find((a) => a.ref.id === 'product-usd')
  assert.equal(usd?.balanceCents, -5_000)
  assert.equal((await listTransfers(db, USER_ID, {}))[0]?.fee, null)
})

test('re-sending the amount a foreign card payment already has moves nothing', async () => {
  const { sqlite, db } = setup()
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 4000,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 400_000,
    categoryId: 'category-1',
    occurredAt: '2026-10-01T12:00:00.000Z',
  })
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'card', id: 'card-1' },
    amount: 400_000,
    receivedAmount: 90,
    debtCurrency: 'USD',
    fee: 2,
    sentAt: '2026-10-05T12:00:00.000Z',
  })
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 90,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 450_000,
    categoryId: 'category-1',
    occurredAt: '2026-10-10T12:00:00.000Z',
  })
  const linked = () =>
    sqlite.prepare('SELECT id, type, amount_cents FROM `transaction` WHERE transfer_id = ? ORDER BY id').all(id)
  const [listed] = await listTransfers(db, USER_ID, {})
  const before = { balances: await balancesOf(db), linked: linked(), listed }

  await updateTransfer(db, USER_ID, id, { amount: listed?.sentAmount })

  assert.deepEqual(await balancesOf(db), before.balances)
  assert.deepEqual(linked(), before.linked)
  assert.deepEqual((await listTransfers(db, USER_ID, {}))[0], before.listed)
})

const foreignCardPayment = async (db: Parameters<typeof createTransfer>[0]) => {
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 4000,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 400_000,
    categoryId: 'category-1',
    occurredAt: '2026-10-01T12:00:00.000Z',
  })
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'card', id: 'card-1' },
    amount: 400_000,
    receivedAmount: 90,
    debtCurrency: 'USD',
    fee: 2,
    sentAt: '2026-10-05T12:00:00.000Z',
  })
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 90,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 450_000,
    categoryId: 'category-1',
    occurredAt: '2026-10-10T12:00:00.000Z',
  })
  return id
}

const foreignSnapshot = async (db: Parameters<typeof createTransfer>[0], sqlite: DatabaseSync, id: string) => ({
  balances: await balancesOf(db),
  transfer: sqlite
    .prepare(
      'SELECT sent_amount_cents, sent_currency, received_amount_cents, received_currency, fee_cents, cost_basis_cents FROM transfer WHERE id = ?',
    )
    .get(id),
  linked: sqlite.prepare('SELECT id, type, amount_cents FROM `transaction` WHERE transfer_id = ? ORDER BY id').all(id),
  listed: (await listTransfers(db, USER_ID, {}))[0],
})

test('re-sending the destination a foreign card payment already has writes nothing', async () => {
  const { sqlite, db } = setup()
  const id = await foreignCardPayment(db)
  const before = await foreignSnapshot(db, sqlite, id)

  await updateTransfer(db, USER_ID, id, { to: { type: 'card', id: 'card-1' } })

  assert.deepEqual(await foreignSnapshot(db, sqlite, id), before)
})

test('the arrived amount sent with the current destination is not dropped', async () => {
  const { sqlite, db } = setup()
  const id = await foreignCardPayment(db)
  const before = await foreignSnapshot(db, sqlite, id)

  await updateTransfer(db, USER_ID, id, { to: { type: 'card', id: 'card-1' }, receivedAmount: 90 })

  assert.deepEqual(await foreignSnapshot(db, sqlite, id), before)
})

test("another user's transfer is not found and stays as it was", async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
  })
  const before = await balancesOf(db)

  await assert.rejects(updateTransfer(db, 'user-2', id, { amount: 900 }), { code: 'transfer_not_found' })

  assert.deepEqual(await balancesOf(db), before)
  assert.equal((await listTransfers(db, USER_ID, {}))[0]?.sentAmount, 100)
})

test('the route patches by id, answers 404 for a foreign one and 401 without a session', async () => {
  const { db } = setup()
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
  })
  const app = new Hono<AppEnv>()
    .use(async (c, next) => {
      c.set('db', db)
      c.set('locale', 'en')
      const who = c.req.header('x-test-user')
      c.set('auth', {
        api: { getSession: async () => (who ? { user: { id: who }, session: { id: 'session' } } : null) },
      } as never)
      await next()
    })
    .route('/api/transfers', transfersRoutes)
    .onError(onError)
  const patch = (who?: string, body: object = { amount: 200 }) =>
    app.request(`/api/transfers/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(who ? { 'x-test-user': who } : {}) },
      body: JSON.stringify(body),
    })

  assert.equal((await patch()).status, 401)

  const foreign = await patch('user-2')
  assert.equal(foreign.status, 404)
  assert.equal(((await foreign.json()) as { code: string }).code, 'transfer_not_found')

  const own = await patch(USER_ID)
  assert.deepEqual(await own.json(), { id, fxDifference: 0, fee: 5 })
  assert.equal((await balancesOf(db)).destination, 20_000)
})
