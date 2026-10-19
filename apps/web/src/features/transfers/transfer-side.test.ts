import assert from 'node:assert/strict'
import { test } from 'node:test'
import { transferSideLabel, type TransferSide } from './transfer-side.ts'

const side = (over: Partial<TransferSide> = {}): TransferSide => ({
  type: 'product',
  id: 'id',
  name: 'Principal',
  bankName: 'Bancolombia',
  last4: '9845',
  ...over,
})

test('a product leads with its bank and details the account', () => {
  assert.deepEqual(transferSideLabel(side()), { headline: 'Bancolombia', detail: 'Principal •••• 9845' })
})

test('a product without a bank leads with its own name', () => {
  assert.equal(transferSideLabel(side({ bankName: null })).headline, 'Principal')
})

test('a product without digits keeps its name as the detail', () => {
  assert.equal(transferSideLabel(side({ last4: null })).detail, 'Principal')
})

test('a cash wallet has no bank and no detail', () => {
  assert.deepEqual(transferSideLabel(side({ type: 'cash_wallet', name: 'Efectivo', bankName: null, last4: null })), {
    headline: 'Efectivo',
    detail: null,
  })
})

test('a card leads with the bank of its product and details its own digits', () => {
  assert.deepEqual(transferSideLabel(side({ type: 'card', name: 'Visa Signature' })), {
    headline: 'Bancolombia',
    detail: 'Visa Signature •••• 9845',
  })
})

test('a card without a bank leads with its own name', () => {
  assert.equal(transferSideLabel(side({ type: 'card', name: 'Visa Signature', bankName: null })).headline, 'Visa Signature')
})
