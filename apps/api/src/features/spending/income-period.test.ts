import assert from 'node:assert/strict'
import { test } from 'node:test'
import { incomePeriod } from './income-period.ts'

test('without an income the period is the rest of the month', () => {
  const period = incomePeriod('2026-10-22', '2026-10-31', [])
  assert.equal(period.end, '2026-10-31')
  assert.equal(period.daysLeft, 10)
  assert.equal(period.expectedCents, 0)
})

test('a payday before the end of the month shortens the period', () => {
  const period = incomePeriod('2026-10-22', '2026-10-31', [{ amountCents: 100000, nextOn: '2026-10-24' }])
  assert.equal(period.end, '2026-10-24')
  assert.equal(period.daysLeft, 3)
  assert.equal(period.expectedCents, 100000)
})

test('a payday after the end of the month changes nothing', () => {
  const period = incomePeriod('2026-10-22', '2026-10-31', [{ amountCents: 100000, nextOn: '2026-11-05' }])
  assert.equal(period.end, '2026-10-31')
  assert.equal(period.expectedCents, 0)
})

test('two incomes on the same day both count', () => {
  const period = incomePeriod('2026-10-22', '2026-10-31', [
    { amountCents: 100000, nextOn: '2026-10-24' },
    { amountCents: 50000, nextOn: '2026-10-24' },
  ])
  assert.equal(period.expectedCents, 150000)
})

test('an income that already came is not counted', () => {
  const period = incomePeriod('2026-10-22', '2026-10-31', [{ amountCents: 100000, nextOn: '2026-10-05' }])
  assert.equal(period.end, '2026-10-31')
  assert.equal(period.expectedCents, 0)
})
