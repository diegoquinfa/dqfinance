import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estimateYield } from './product-yield.ts'

test('monthly and daily yield come from the effective annual rate, never a division of it', () => {
  // 12% E.A. on 1,000,000 cents: 1.12^(1/12) − 1 ≈ 0.9489% a month, not 1%.
  const estimate = estimateYield(1_000_000, 1_200)!
  assert.equal(estimate.monthlyCents, 9_489)
  assert.equal(estimate.dailyCents, 311)
  // Compounding makes the month smaller than a naive twelfth of the year (10,000 cents).
  assert.ok(estimate.monthlyCents < 10_000)
})

test('a zero rate earns nothing and no rate means no estimate', () => {
  assert.deepEqual(estimateYield(500_000, 0), { monthlyCents: 0, dailyCents: 0 })
  assert.equal(estimateYield(500_000, null), null)
})

test('a negative balance (an overdraft) estimates a negative yield', () => {
  assert.equal(estimateYield(-1_000_000, 1_200)!.monthlyCents, -9_489)
})
