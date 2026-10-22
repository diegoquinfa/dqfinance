import assert from 'node:assert/strict'
import { test } from 'node:test'
import { futureShares, installmentShares, monthsBetween } from './installments.ts'

test('the months between two months', () => {
  assert.equal(monthsBetween('2026-10-01', '2026-10-22'), 0)
  assert.equal(monthsBetween('2026-10-01', '2026-12-01'), 2)
  assert.equal(monthsBetween('2026-10-01', '2027-01-01'), 3)
})

test('an expense in one month is one share', () => {
  assert.deepEqual(installmentShares(100000, 1), [100000])
})

test('the shares add up to the whole amount', () => {
  const shares = installmentShares(100000, 3)
  assert.deepEqual(shares, [33334, 33333, 33333])
  assert.equal(shares.reduce((sum, share) => sum + share, 0), 100000)
})

test('the cents that do not divide stay with the first month', () => {
  assert.deepEqual(installmentShares(100, 3), [34, 33, 33])
})

test('the months after the current one are what the expense still owes', () => {
  // Bought in October, spread over six months: October, November, December, January, February, March.
  assert.equal(futureShares(600000, 6, 0), 500000)
  assert.equal(futureShares(600000, 6, 1), 400000)
  assert.equal(futureShares(600000, 6, 5), 0)
  assert.equal(futureShares(600000, 6, 6), 0)
})

test('an expense from a past month keeps only what is left', () => {
  assert.equal(futureShares(600000, 6, 3), 200000)
})
