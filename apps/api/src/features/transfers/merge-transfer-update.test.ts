import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CreateTransferInput } from './create-transfer.ts'
import { mergeTransferUpdate } from './merge-transfer-update.ts'

const current: CreateTransferInput = {
  from: { type: 'product', id: 'checking' },
  to: { type: 'cash_wallet', id: 'cash' },
  amount: 100,
  receivedAmount: undefined,
  debtCurrency: undefined,
  fee: 5,
  note: 'Moved to cash',
  sentAt: '2026-10-18T17:00:00.000Z',
  inTransit: false,
}

test('an empty patch keeps the transfer as it was', () => {
  assert.deepEqual(mergeTransferUpdate(current, {}), current)
})

test('a field in the patch replaces only that field', () => {
  assert.deepEqual(mergeTransferUpdate(current, { amount: 250, sentAt: '2026-10-19T09:00:00.000Z' }), {
    ...current,
    amount: 250,
    sentAt: '2026-10-19T09:00:00.000Z',
  })
})

test('null removes the note and the fee; undefined keeps them', () => {
  const cleared = mergeTransferUpdate(current, { note: null, fee: null })
  assert.equal(cleared.note, undefined)
  assert.equal(cleared.fee, undefined)
  assert.equal(mergeTransferUpdate(current, { note: undefined }).note, 'Moved to cash')
  assert.equal(mergeTransferUpdate(current, { fee: undefined }).fee, 5)
})
