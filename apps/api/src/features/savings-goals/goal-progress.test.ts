import assert from 'node:assert/strict'
import { test } from 'node:test'
import { goalProgress, monthsLeft, savedRatio } from './goal-progress.ts'

test('the months left count the current one', () => {
  assert.equal(monthsLeft('2026-10-22', '2026-10-15'), 1)
  assert.equal(monthsLeft('2026-10-22', '2026-12-01'), 3)
  assert.equal(monthsLeft('2026-10-22', '2027-01-10'), 4)
})

test('a goal whose date has passed still has one month', () => {
  assert.equal(monthsLeft('2026-10-22', '2026-09-01'), 1)
})

test('the progress never goes past the goal', () => {
  assert.equal(savedRatio(100000, 0), 0)
  assert.equal(savedRatio(100000, 50000), 0.5)
  assert.equal(savedRatio(100000, 150000), 1)
})

test('a goal reserves what is left over the months left', () => {
  const progress = goalProgress({ targetCents: 120000, contributedCents: 0, targetDate: '2026-12-01' }, '2026-10-22')
  assert.equal(progress.monthsLeft, 3)
  assert.equal(progress.remainingCents, 120000)
  assert.equal(progress.monthlyCents, 40000)
})

test('a goal without a date reserves nothing', () => {
  const progress = goalProgress({ targetCents: 120000, contributedCents: 0, targetDate: null }, '2026-10-22')
  assert.equal(progress.monthsLeft, null)
  assert.equal(progress.monthlyCents, 0)
})

test('a goal that is already reached has nothing left', () => {
  const progress = goalProgress({ targetCents: 100000, contributedCents: 100000, targetDate: '2026-12-01' }, '2026-10-22')
  assert.equal(progress.remainingCents, 0)
  assert.equal(progress.monthlyCents, 0)
  assert.equal(progress.ratio, 1)
})
