import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shareInMonth } from '../transactions/installments.ts'
import { budgetProgress } from './budget-progress.ts'

test('a budget that was not touched has all of it left', () => {
  const progress = budgetProgress(100000, 0)
  assert.equal(progress.leftCents, 100000)
  assert.equal(progress.ratio, 0)
  assert.equal(progress.close, false)
})

test('what was spent comes out of the limit', () => {
  const progress = budgetProgress(100000, 40000)
  assert.equal(progress.leftCents, 60000)
  assert.equal(progress.ratio, 0.4)
})

test('a budget over its limit is past one', () => {
  const progress = budgetProgress(100000, 120000)
  assert.equal(progress.leftCents, -20000)
  assert.equal(progress.ratio, 1.2)
})

test('a budget close to its limit says so', () => {
  assert.equal(budgetProgress(100000, 80000).close, true)
  assert.equal(budgetProgress(100000, 79000).close, false)
})

test('a budget without a limit has no ratio', () => {
  const progress = budgetProgress(0, 50000)
  assert.equal(progress.ratio, 0)
  assert.equal(progress.close, false)
})

test('a spread purchase weighs its share on the budget, this month and the next', () => {
  // 600,000 over six months against a 200,000 limit: 100,000 belongs to each of those months.
  const now = budgetProgress(200000, shareInMonth(600000, 6, 0))
  assert.equal(now.spentCents, 100000)
  assert.equal(now.leftCents, 100000)
  assert.equal(now.ratio, 0.5)
  assert.equal(budgetProgress(200000, shareInMonth(600000, 6, 1)).spentCents, 100000)
})
