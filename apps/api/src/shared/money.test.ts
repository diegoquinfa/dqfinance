import assert from 'node:assert/strict'
import { test } from 'node:test'
import { currencyCode, fromCents, toCents } from './money.ts'

test('stores decimal amounts as integer cents without float drift', () => {
  assert.equal(toCents(19.99), 1999)
  assert.equal(toCents(0.1 + 0.2), 30)
  assert.equal(toCents(45000.5), 4500050)
})

test('round-trips cents back to the original decimal', () => {
  for (const amount of [0.01, 19.99, 45000.5, 1234567.89]) assert.equal(fromCents(toCents(amount)), amount)
})

test('accepts known currencies in any case and rejects unknown ones', () => {
  assert.equal(currencyCode.parse('cop'), 'COP')
  assert.equal(currencyCode.safeParse('XYZ').success, false)
})
