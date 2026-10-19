import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAccountsTree } from './accounts-tree.ts'

type ProductRow = {
  id: string
  userId: string
  bankAccountId: string
  type: 'savings' | 'checking' | 'payroll' | 'investment' | 'other' | 'pocket'
  name: string
  currency: string
  annualRateBps: number | null
  parentProductId: string | null
  yieldPayout: 'daily' | 'monthly' | null
  createdAt: Date
}
type Tree = ReturnType<typeof buildAccountsTree>

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 19, 0, minutes))

const bank = { id: 'bank-1', userId: 'user-1', name: 'Bank', createdAt: at(0) }
const bankAccount = { id: 'account-1', userId: 'user-1', bankId: 'bank-1', name: 'Account', last4: '1234', createdAt: at(0) }
const aProduct = (id: string, overrides: Partial<ProductRow> = {}): ProductRow => ({
  id,
  userId: 'user-1',
  bankAccountId: 'account-1',
  type: 'savings',
  name: id,
  currency: 'COP',
  annualRateBps: null,
  parentProductId: null,
  yieldPayout: null,
  createdAt: at(0),
  ...overrides,
})

const treeOf = (products: ProductRow[]): Tree =>
  buildAccountsTree({ banks: [bank], accounts: [bankAccount], products, cards: [], wallets: [] })

const productsOf = (tree: Tree) => tree.banks[0]!.accounts[0]!.products

test('a pocket hangs under its parent and is not repeated in the account products', () => {
  const products = productsOf(
    treeOf([
      aProduct('savings', { name: 'Savings', annualRateBps: 900, yieldPayout: 'monthly' }),
      aProduct('pocket', { type: 'pocket', name: 'Home services', parentProductId: 'savings', createdAt: at(5) }),
    ]),
  )
  assert.deepEqual(
    products.map((p) => p.id),
    ['savings'],
  )
  const pocket = products[0]!.pockets[0]!
  assert.equal(products[0]!.pockets.length, 1)
  assert.equal(pocket.type, 'pocket')
  assert.equal(pocket.parentProductId, 'savings')
  assert.deepEqual(pocket.cards, [])
})

test('a product shows its parent and its yield payout', () => {
  const row = productsOf(treeOf([aProduct('savings', { annualRateBps: 900, yieldPayout: 'daily' })]))[0]!
  assert.equal(row.parentProductId, null)
  assert.equal(row.yieldPayout, 'daily')
  assert.equal(row.annualRateBps, 900)
})

test('products and pockets keep the order they were created in', () => {
  const products = productsOf(
    treeOf([
      aProduct('savings', { createdAt: at(0) }),
      aProduct('checking', { createdAt: at(2) }),
      aProduct('pocket-1', { type: 'pocket', parentProductId: 'savings', createdAt: at(3) }),
      aProduct('pocket-2', { type: 'pocket', parentProductId: 'savings', createdAt: at(4) }),
    ]),
  )
  assert.deepEqual(
    products.map((p) => p.id),
    ['savings', 'checking'],
  )
  assert.deepEqual(
    products[0]!.pockets.map((p) => p.id),
    ['pocket-1', 'pocket-2'],
  )
})
