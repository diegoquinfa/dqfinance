import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shareInMonth } from '../transactions/installments.ts'
import { safeToSpend, type SafeToSpendInput } from './safe-to-spend.ts'

const input = (over: Partial<SafeToSpendInput> = {}): SafeToSpendInput => ({
  availableCents: 500000,
  pendingBillsCents: 120000,
  setAsidesCents: 0,
  spentCents: 0,
  targetCents: null,
  daysLeft: 10,
  ...over,
})

test('the money left after the bills is the daily allowance', () => {
  const result = safeToSpend(input())
  assert.equal(result.freeCents, 380000)
  assert.equal(result.dailyCents, 38000)
  assert.equal(result.allowedCents, 38000)
})

test('the set-asides come out before the division', () => {
  const result = safeToSpend(input({ setAsidesCents: 50000 }))
  assert.equal(result.freeCents, 330000)
  assert.equal(result.dailyCents, 33000)
})

test('the cap wins when it is lower than what the money allows', () => {
  const result = safeToSpend(input({ targetCents: 200000, spentCents: 50000 }))
  assert.equal(result.targetDailyCents, 15000)
  assert.equal(result.allowedCents, 15000)
  assert.equal(result.cappedByTarget, true)
})

test('the money wins when it is lower than the cap', () => {
  const result = safeToSpend(input({ targetCents: 900000, spentCents: 0 }))
  assert.equal(result.allowedCents, 38000)
  assert.equal(result.cappedByTarget, false)
})

test('the daily allowance never promises more than a cent', () => {
  const result = safeToSpend(input({ availableCents: 100001, pendingBillsCents: 0, daysLeft: 3 }))
  assert.equal(result.dailyCents, 33333)
})

test('a day left is one day, never zero', () => {
  assert.equal(safeToSpend(input({ daysLeft: 0 })).daysLeft, 1)
})

test('overspending shows as a negative allowance, not as zero', () => {
  const result = safeToSpend(input({ availableCents: 10000, pendingBillsCents: 20000 }))
  assert.equal(result.freeCents, -10000)
  assert.equal(result.dailyCents, -1000)
})

test('a cap already passed holds the number below zero', () => {
  const result = safeToSpend(input({ targetCents: 100000, spentCents: 120000 }))
  assert.equal(result.targetDailyCents, -2000)
  assert.equal(result.allowedCents, -2000)
})

test('the cap counts the share of a spread purchase, not the whole amount', () => {
  // 600,000 over six months with a 500,000 cap: this month carries 100,000, so (500,000 − 100,000) / 10.
  const result = safeToSpend(
    input({ availableCents: 1200000, pendingBillsCents: 0, spentCents: shareInMonth(600000, 6, 0), targetCents: 500000 }),
  )
  assert.equal(result.targetDailyCents, 40000)
  assert.equal(result.allowedCents, 40000)
  assert.equal(result.cappedByTarget, true)
})
