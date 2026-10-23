import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayAfter, lastMonths, periodRange } from './periods.ts'

test('dayAfter steps one calendar day, across month, year and leap-day edges', () => {
  assert.equal(dayAfter('2026-10-31'), '2026-11-01')
  assert.equal(dayAfter('2026-12-31'), '2027-01-01')
  assert.equal(dayAfter('2028-02-28'), '2028-02-29')
})

test('periods cover whole calendar units and cross month and year edges', () => {
  const sunday = new Date(2026, 9, 18, 23, 0) // Sunday 18 Oct 2026
  assert.deepEqual(periodRange('week', 0, sunday), { from: '2026-10-12', to: '2026-10-19' })
  assert.deepEqual(periodRange('week', -1, sunday), { from: '2026-10-05', to: '2026-10-12' })
  assert.deepEqual(periodRange('week', 0, new Date(2026, 8, 30)), { from: '2026-09-28', to: '2026-10-05' })
  assert.deepEqual(periodRange('month', 0, sunday), { from: '2026-10-01', to: '2026-11-01' })
  assert.deepEqual(periodRange('month', -10, sunday), { from: '2025-12-01', to: '2026-01-01' })
  assert.deepEqual(periodRange('year', -1, sunday), { from: '2025-01-01', to: '2026-01-01' })
  assert.deepEqual(lastMonths(6, sunday), { from: '2026-05-01' })
})
