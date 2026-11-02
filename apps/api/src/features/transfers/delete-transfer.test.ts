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
const { deleteTransfer } = await import('./delete-transfer.ts')
const { listTransfers } = await import('./list-transfers.ts')
const { transfersRoutes } = await import('./transfers.routes.ts')
const { getBalances } = await import('../balances/get-balances.ts')
const { createTransaction } = await import('../transactions/create-transaction.ts')

const seed = (sqlite: DatabaseSync) => {
  seedCardUser(sqlite)
  sqlite.exec(`INSERT INTO cash_wallet (id, user_id, name, currency, created_at) VALUES ('wallet-1', '${USER_ID}', 'Cash', 'COP', 1)`)
}

const leftoverRows = (sqlite: DatabaseSync, id: string) =>
  sqlite.prepare('SELECT id FROM `transaction` WHERE transfer_id = ?').all(id)

const setup = () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  return { sqlite, db: createDb(d1) }
}

// A transfer with a fee: the transfer plus the expense entry it links on the origin.
const seededTransfer = (db: ReturnType<typeof createDb>) =>
  createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
  })

test('deleting a transfer moves both balances back and takes its fee entry with it', async () => {
  const { sqlite, db } = setup()

  const before = await getBalances(db, USER_ID)
  const { id } = await seededTransfer(db)
  assert.notDeepEqual(await getBalances(db, USER_ID), before)
  assert.equal((await listTransfers(db, USER_ID, {})).length, 1)

  await deleteTransfer(db, USER_ID, id)

  assert.deepEqual(await getBalances(db, USER_ID), before)
  assert.equal((await listTransfers(db, USER_ID, {})).length, 0)
  assert.deepEqual(leftoverRows(sqlite, id), [])
})

test('an in-transit transfer gives the origin back and clears what was in transit', async () => {
  const { db } = setup()
  const before = await getBalances(db, USER_ID)
  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    inTransit: true,
  })
  assert.equal((await getBalances(db, USER_ID)).inTransit.length, 1)

  await deleteTransfer(db, USER_ID, id)

  assert.deepEqual(await getBalances(db, USER_ID), before)
})

test('a card payment with a fee leaves the debt and the origin exactly as they were', async () => {
  const { db } = setup()
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 500,
    source: { type: 'card', id: 'card-1' },
    categoryId: 'category-1',
  })
  const before = await getBalances(db, USER_ID)

  const { id } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'card', id: 'card-1' },
    amount: 200,
    fee: 10,
  })
  assert.equal((await getBalances(db, USER_ID)).creditCards.find((c) => c.ref.id === 'card-1')?.totalCents, 30_000)

  await deleteTransfer(db, USER_ID, id)

  assert.deepEqual(await getBalances(db, USER_ID), before)
})

test('paying foreign card debt takes its FX entry with the transfer', async () => {
  const { sqlite, db } = setup()
  sqlite.exec(`INSERT INTO user_currency (user_id, code, created_at) VALUES ('${USER_ID}', 'USD', 1)`)
  await createTransaction(db, USER_ID, {
    type: 'expense',
    amount: 25,
    source: { type: 'card', id: 'card-1' },
    currency: 'USD',
    primaryAmount: 1000,
    categoryId: 'category-1',
  })
  const before = await getBalances(db, USER_ID)

  const { id, fxDifference } = await createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'card', id: 'card-1' },
    amount: 1200,
    receivedAmount: 25,
    debtCurrency: 'USD',
    fee: 3,
  })
  assert.equal(fxDifference, 200)
  assert.deepEqual((await getBalances(db, USER_ID)).creditCards.find((c) => c.ref.id === 'card-1')?.debts, [])

  await deleteTransfer(db, USER_ID, id)

  assert.deepEqual(await getBalances(db, USER_ID), before)
  assert.deepEqual(leftoverRows(sqlite, id), [])
})

test('deleting the same transfer twice reports it is gone and changes nothing', async () => {
  const { db } = setup()
  const { id } = await seededTransfer(db)
  await deleteTransfer(db, USER_ID, id)
  const after = await getBalances(db, USER_ID)

  await assert.rejects(deleteTransfer(db, USER_ID, id), { code: 'transfer_not_found' })

  assert.deepEqual(await getBalances(db, USER_ID), after)
})

test("another user's transfer is not found and stays", async () => {
  const { sqlite, db } = setup()
  const { id } = await seededTransfer(db)

  await assert.rejects(deleteTransfer(db, 'user-2', id), { code: 'transfer_not_found' })

  assert.equal((await listTransfers(db, USER_ID, {})).length, 1)
  assert.equal(leftoverRows(sqlite, id).length, 1)
})

test('the route deletes by id, answers 404 for a foreign one and 401 without a session', async () => {
  const { db } = setup()
  const { id } = await seededTransfer(db)
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
  const remove = (path: string, who?: string) =>
    app.request(path, { method: 'DELETE', headers: who ? { 'x-test-user': who } : {} })

  assert.equal((await remove(`/api/transfers/${id}`)).status, 401)

  const foreign = await remove(`/api/transfers/${id}`, 'user-2')
  assert.equal(foreign.status, 404)
  assert.equal(((await foreign.json()) as { code: string }).code, 'transfer_not_found')

  const own = await remove(`/api/transfers/${id}`, USER_ID)
  assert.deepEqual(await own.json(), { id, deleted: true })
  assert.deepEqual(await (await app.request('/api/transfers', { headers: { 'x-test-user': USER_ID } })).json(), [])
})
