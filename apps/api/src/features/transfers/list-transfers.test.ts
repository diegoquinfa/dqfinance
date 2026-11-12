import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { createTransfer } = await import('./create-transfer.ts')
const { listTransfers } = await import('./list-transfers.ts')

const setup = () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.exec(`INSERT INTO cash_wallet (id, user_id, name, currency, created_at) VALUES ('wallet-1', '${USER_ID}', 'Cash', 'COP', 1)`)
  return createDb(d1)
}

// D1 caps a query at 100 bound parameters: a full page of transfers must not bind one per row.
test('a page of 100 transfers is listed without exceeding the D1 parameter limit', async () => {
  const db = setup()
  for (let i = 0; i < 100; i++) {
    await createTransfer(db, USER_ID, {
      from: { type: 'product', id: 'product-1' },
      to: { type: 'cash_wallet', id: 'wallet-1' },
      amount: 100,
    })
  }

  assert.equal((await listTransfers(db, USER_ID, { limit: 100 })).length, 100)
})
