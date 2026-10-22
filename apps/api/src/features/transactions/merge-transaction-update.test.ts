import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CreateTransactionInput } from './create-transaction.ts'
import { mergeTransactionUpdate } from './merge-transaction-update.ts'

const current: CreateTransactionInput = {
  type: 'expense',
  amount: 20,
  source: { type: 'card', id: 'visa' },
  currency: 'USD',
  primaryAmount: 80000,
  categoryId: 'food',
  counterpartyId: 'jose',
  title: 'Lunch',
  description: 'Lunch with the team',
  installmentMonths: undefined,
  occurredAt: '2026-10-18T17:00:00.000Z',
}

test('an empty patch keeps the movement as it was', () => {
  assert.deepEqual(mergeTransactionUpdate(current, {}), current)
})

test('a field in the patch replaces only that field', () => {
  assert.deepEqual(mergeTransactionUpdate(current, { amount: 25, categoryId: 'fun' }), {
    ...current,
    amount: 25,
    categoryId: 'fun',
  })
})

test('null removes the contact, the title and the description; undefined keeps them', () => {
  const merged = mergeTransactionUpdate(current, { counterpartyId: null, title: null, description: null })
  assert.equal(merged.counterpartyId, undefined)
  assert.equal(merged.title, undefined)
  assert.equal(merged.description, undefined)
  assert.equal(mergeTransactionUpdate(current, { counterpartyId: undefined }).counterpartyId, 'jose')
  assert.equal(mergeTransactionUpdate(current, { title: undefined }).title, 'Lunch')
  assert.equal(mergeTransactionUpdate(current, { description: undefined }).description, 'Lunch with the team')
})

test('a new source drops the old charge currency and primary amount', () => {
  const merged = mergeTransactionUpdate(current, { source: { type: 'product', id: 'savings' } })
  assert.equal(merged.currency, undefined)
  assert.equal(merged.primaryAmount, undefined)
})

test('a new source keeps the currency and primary amount the patch names', () => {
  const merged = mergeTransactionUpdate(current, {
    source: { type: 'card', id: 'master' },
    currency: 'EUR',
    primaryAmount: 90000,
  })
  assert.equal(merged.currency, 'EUR')
  assert.equal(merged.primaryAmount, 90000)
})

test('the months of a spread expense can be set and taken away', () => {
  assert.equal(mergeTransactionUpdate(current, { installmentMonths: 6 }).installmentMonths, 6)
  assert.equal(mergeTransactionUpdate(current, { installmentMonths: 6, amount: 25 }).installmentMonths, 6)
  assert.equal(mergeTransactionUpdate(current, { installmentMonths: null }).installmentMonths, undefined)
})
