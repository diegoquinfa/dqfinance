import assert from 'node:assert/strict'
import { test } from 'node:test'
import { transactionPushCopy } from './transaction-push-copy.ts'

test('income and expense notifications name the movement', () => {
  const income = transactionPushCopy('income', 'es')
  const expense = transactionPushCopy('expense', 'es')
  assert.match(income.title, /ingreso/)
  assert.match(expense.title, /gasto/)
  assert.equal(income.body, expense.body)
  assert.notEqual(transactionPushCopy('income', 'en').title, transactionPushCopy('expense', 'en').title)
})
