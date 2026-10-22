import assert from 'node:assert/strict'
import { test } from 'node:test'
import { monthlySetAside } from './monthly-set-aside.ts'

test('a yearly bill sets aside a twelfth of its amount every month', () => {
  assert.equal(monthlySetAside(1200000), 100000)
})

test('the cents that do not divide stay with the bill', () => {
  assert.equal(monthlySetAside(100000), 8333)
})

test('a bill too small to split sets nothing aside', () => {
  assert.equal(monthlySetAside(600), 50)
  assert.equal(monthlySetAside(11), 0)
})
