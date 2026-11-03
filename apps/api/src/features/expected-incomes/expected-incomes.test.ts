import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { createExpectedIncome } = await import('./create-expected-income.ts')
const { listExpectedIncomes } = await import('./list-expected-incomes.ts')
const { deleteCounterparty } = await import('../counterparties/delete-counterparty.ts')

const seed = (sqlite: ReturnType<typeof openTestDb>['sqlite']) => {
  seedCardUser(sqlite)
  sqlite.exec(`INSERT INTO user_currency (user_id, code, created_at) VALUES ('${USER_ID}', 'COP', 1)`)
  sqlite.exec(
    `INSERT INTO counterparty (id, user_id, name, kind, created_at) VALUES ('contact-1', '${USER_ID}', 'KURBUO', 'business', 1)`,
  )
  sqlite.exec(
    `INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Beto', 'beto@example.com', 1, 1, 1)`,
  )
  sqlite.exec(
    `INSERT INTO counterparty (id, user_id, name, kind, created_at) VALUES ('contact-2', 'user-2', 'Other person', 'person', 1)`,
  )
}

test('an income keeps the contact that pays it, and the list names it', async () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)

  await createExpectedIncome(db, USER_ID, {
    name: 'Salario',
    amount: 5_000_000,
    frequency: 'monthly',
    nextOn: '2026-11-05',
    counterpartyId: 'contact-1',
  })

  const [income] = await listExpectedIncomes(db, USER_ID)
  assert.deepEqual(income?.counterparty, { id: 'contact-1', name: 'KURBUO' })
  assert.equal(income?.amount, 5_000_000)
})

test('an income without a contact lists no contact', async () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)

  await createExpectedIncome(db, USER_ID, { name: 'Rent', amount: 900_000, frequency: 'monthly' })

  assert.equal((await listExpectedIncomes(db, USER_ID))[0]?.counterparty, null)
})

test('deleting the contact that pays an income leaves the income without one', async () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)
  await createExpectedIncome(db, USER_ID, {
    name: 'Salario',
    amount: 5_000_000,
    frequency: 'monthly',
    counterpartyId: 'contact-1',
  })

  await deleteCounterparty(db, USER_ID, 'contact-1')

  const [income] = await listExpectedIncomes(db, USER_ID)
  assert.equal(income?.name, 'Salario')
  assert.equal(income?.counterparty, null)
})

test("another user's contact is not found and nothing is written", async () => {
  const { sqlite, d1 } = openTestDb()
  seed(sqlite)
  const db = createDb(d1)

  await assert.rejects(
    createExpectedIncome(db, USER_ID, {
      name: 'Salario',
      amount: 5_000_000,
      frequency: 'monthly',
      counterpartyId: 'contact-2',
    }),
    { code: 'counterparty_not_found' },
  )

  assert.deepEqual(sqlite.prepare('SELECT id FROM expected_income').all(), [])
})
