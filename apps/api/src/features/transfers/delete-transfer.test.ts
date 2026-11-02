import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { createTransfer } = await import('./create-transfer.ts')
const { deleteTransfer } = await import('./delete-transfer.ts')
const { listTransfers } = await import('./list-transfers.ts')
const { getBalances } = await import('../balances/get-balances.ts')

const seed = (sqlite: DatabaseSync) => {
  seedCardUser(sqlite)
  sqlite.exec(`INSERT INTO cash_wallet (id, user_id, name, currency, created_at) VALUES ('wallet-1', '${USER_ID}', 'Cash', 'COP', 1)`)
}

// A transfer with a fee: the transfer plus the expense entry it links on the origin.
const seededTransfer = async (db: ReturnType<typeof createDb>) =>
  createTransfer(db, USER_ID, {
    from: { type: 'product', id: 'product-1' },
    to: { type: 'cash_wallet', id: 'wallet-1' },
    amount: 100,
    fee: 5,
  })

test('deleting a transfer moves both balances back and takes its fee entry with it', async () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)

  const before = await getBalances(db, USER_ID)
  const { id } = await seededTransfer(db)
  assert.notDeepEqual(await getBalances(db, USER_ID), before)
  assert.equal((await listTransfers(db, USER_ID, {})).length, 1)

  await deleteTransfer(db, USER_ID, id)

  assert.deepEqual(await getBalances(db, USER_ID), before)
  assert.equal((await listTransfers(db, USER_ID, {})).length, 0)
  const leftovers = sqlite.prepare('SELECT id FROM `transaction` WHERE transfer_id = ?').all(id)
  assert.deepEqual(leftovers, [])
})

test("another user's transfer is not found and stays", async () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)
  const { id } = await seededTransfer(db)

  await assert.rejects(deleteTransfer(db, 'user-2', id), { code: 'transfer_not_found' })

  assert.equal((await listTransfers(db, USER_ID, {})).length, 1)
})
