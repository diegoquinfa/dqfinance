import assert from 'node:assert/strict'
import { test } from 'node:test'
import { monthPeriod } from './spending-period.ts'

test('the period ends on the last day of the month and counts today', () => {
  assert.deepEqual(monthPeriod('2026-10-22'), { end: '2026-10-31', daysLeft: 10 })
})

test('the last day of the month leaves one day', () => {
  assert.deepEqual(monthPeriod('2026-10-31'), { end: '2026-10-31', daysLeft: 1 })
})

test('February knows its leap year', () => {
  assert.deepEqual(monthPeriod('2028-02-10'), { end: '2028-02-29', daysLeft: 20 })
  assert.deepEqual(monthPeriod('2026-02-10'), { end: '2026-02-28', daysLeft: 19 })
})

test('December ends the year', () => {
  assert.deepEqual(monthPeriod('2026-12-15'), { end: '2026-12-31', daysLeft: 17 })
})
