import assert from 'node:assert/strict'
import { test } from 'node:test'
import { transferType } from './transfer-type.ts'

const product = (bankId: string) => ({ type: 'product' as const, bankId })
const cash = { type: 'cash_wallet' as const, bankId: null }
const card = { type: 'card' as const, bankId: 'a' }

test('derives the transfer type from origin and destination', () => {
  assert.equal(transferType(product('a'), product('a')), 'own_same_bank')
  assert.equal(transferType(product('a'), product('b')), 'own_other_bank')
  assert.equal(transferType(product('a'), cash), 'withdrawal')
  assert.equal(transferType(cash, product('a')), 'deposit')
  assert.equal(transferType(cash, cash), 'cash_exchange')
  assert.equal(transferType(product('a'), card), 'card_payment')
  assert.equal(transferType(cash, card), 'card_payment')
})
