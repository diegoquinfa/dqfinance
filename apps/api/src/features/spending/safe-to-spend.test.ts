import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shareInMonth } from '../transactions/installments.ts'
import {
  billsDueCents,
  goalReservationCents,
  monthSpentCents,
  safeToSpend,
  yearlySetAsideCents,
  type SafeToSpendInput,
} from './safe-to-spend.ts'

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

test('a weekly bill that falls twice before the period ends counts twice', () => {
  const bill = { amountCents: 20000, startsOn: '2026-10-01', nextDueOn: '2026-10-02', frequency: 'weekly' as const }
  assert.equal(billsDueCents([bill], '2026-10-01', '2026-10-15'), 40000)
})

test('an overdue bill counts once, and its occurrences from today on still count', () => {
  const overdue = { amountCents: 90000, startsOn: '2026-09-05', nextDueOn: '2026-09-05', frequency: 'monthly' as const }
  assert.equal(billsDueCents([overdue], '2026-10-10', '2026-10-31'), 90000)
  // A weekly bill three weeks late: the overdue date once, plus the three still to come.
  const weekly = { amountCents: 20000, startsOn: '2026-10-01', nextDueOn: '2026-10-01', frequency: 'weekly' as const }
  assert.equal(billsDueCents([weekly], '2026-10-10', '2026-10-31'), 80000)
  const due = { amountCents: 90000, startsOn: '2026-09-20', nextDueOn: '2026-10-20', frequency: 'monthly' as const }
  assert.equal(billsDueCents([due], '2026-10-10', '2026-10-31'), 90000)
})

test('a yearly bill due in eleven months holds one twelfth', () => {
  const bill = { amountCents: 1200000, nextDueOn: '2027-09-20' }
  assert.equal(yearlySetAsideCents([bill], '2026-10-31', '2026-10'), 100000)
})

test('a yearly bill due next month holds eleven twelfths', () => {
  const bill = { amountCents: 1200000, nextDueOn: '2026-11-15' }
  assert.equal(yearlySetAsideCents([bill], '2026-10-31', '2026-10'), 1100000)
})

test('a yearly bill due this month, after the period ends, holds all of it', () => {
  const bill = { amountCents: 1200000, nextDueOn: '2026-10-28' }
  assert.equal(yearlySetAsideCents([bill], '2026-10-25', '2026-10'), 1200000)
})

test('a yearly bill more than eleven months away still holds one twelfth', () => {
  const bill = { amountCents: 1200000, nextDueOn: '2027-10-22' }
  assert.equal(yearlySetAsideCents([bill], '2026-10-31', '2026-10'), 100000)
})

test('the twelfths held round down to the cent', () => {
  // 100,001 × 11 / 12 = 91,667.58 cents: the 0.58 stays with the bill.
  const bill = { amountCents: 100001, nextDueOn: '2026-11-15' }
  assert.equal(yearlySetAsideCents([bill], '2026-10-31', '2026-10'), 91667)
})

test('a yearly bill due before the period ends is a pending bill, not held twice', () => {
  const due = { amountCents: 1200000, nextDueOn: '2026-10-20' }
  assert.equal(yearlySetAsideCents([due], '2026-10-31', '2026-10'), 0)
})

test('a goal reserves what it holds plus the share of this month', () => {
  // 3,000,000 target, 2,500,000 saved, 500,000 left over three months: 166,666 this month.
  assert.equal(goalReservationCents(3000000, 2500000, 166666), 2666666)
})

test('a goal without a date reserves what it already holds', () => {
  assert.equal(goalReservationCents(3000000, 2500000, 0), 2500000)
})

test('a goal never reserves more than its target', () => {
  assert.equal(goalReservationCents(3000000, 2900000, 166666), 3000000)
  assert.equal(goalReservationCents(3000000, 3500000, 0), 3000000)
})

test('a foreign card charge counts its value in the card currency', () => {
  // $5 on a COP card is 200,000 COP cents: the movement the query sums, not the $5 charge.
  const movement = { amountCents: 200000, months: null, occurredAt: new Date('2026-10-05T15:00:00Z') }
  assert.equal(monthSpentCents([movement], 'UTC', '2026-10'), 200000)
})
