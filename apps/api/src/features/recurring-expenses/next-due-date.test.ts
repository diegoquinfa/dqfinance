import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextDueDate } from './next-due-date.ts'

test('weekly adds seven days across month and year ends', () => {
  assert.equal(nextDueDate('2026-12-28', '2026-12-28', 'weekly'), '2027-01-04')
})

test('monthly keeps the start day, clamped to short months, without drifting', () => {
  assert.equal(nextDueDate('2026-01-31', '2026-01-31', 'monthly'), '2026-02-28')
  assert.equal(nextDueDate('2026-01-31', '2026-02-28', 'monthly'), '2026-03-31')
  assert.equal(nextDueDate('2026-01-15', '2026-12-15', 'monthly'), '2027-01-15')
})

test('yearly handles Feb 29', () => {
  assert.equal(nextDueDate('2028-02-29', '2028-02-29', 'yearly'), '2029-02-28')
  assert.equal(nextDueDate('2028-02-29', '2031-02-28', 'yearly'), '2032-02-29')
})
