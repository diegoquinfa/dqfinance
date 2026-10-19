import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pushCopy, type PushKind } from './push-copy.ts'

test('income and expense notifications name the movement', () => {
  const income = pushCopy('income', 'es')
  const expense = pushCopy('expense', 'es')
  assert.match(income.title, /ingreso/)
  assert.match(expense.title, /gasto/)
  assert.equal(income.body, expense.body)
  assert.notEqual(pushCopy('income', 'en').title, pushCopy('expense', 'en').title)
})

test('every write kind has its own localized title and the shared body', () => {
  const kinds: PushKind[] = ['income', 'expense', 'transfer', 'transfer_received', 'balance_adjustment']
  for (const locale of ['en', 'es'] as const) {
    const copies = kinds.map((kind) => pushCopy(kind, locale))
    assert.equal(new Set(copies.map((copy) => copy.title)).size, kinds.length, `${locale} titles differ`)
    assert.equal(new Set(copies.map((copy) => copy.body)).size, 1, `${locale} shares one body`)
  }
  assert.match(pushCopy('transfer', 'es').title, /transferencia/)
  assert.match(pushCopy('transfer_received', 'en').title, /received/i)
  assert.match(pushCopy('balance_adjustment', 'en').title, /balance/i)
})
