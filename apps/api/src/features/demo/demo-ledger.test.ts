import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayFrom, dayIn, demoMovements, demoTransfers } from './demo-ledger.ts'

const today = '2026-03-18'

test('dayIn walks back month by month and keeps the day of the month', () => {
  assert.equal(dayIn(today, 0, 1), '2026-03-01')
  assert.equal(dayIn(today, 1, 1), '2026-02-01')
  assert.equal(dayIn(today, 2, 15), '2026-01-15')
  assert.equal(dayIn(today, 12, 28), '2025-03-28')
})

test('dayFrom counts days ahead', () => {
  assert.equal(dayFrom(today, 3), '2026-03-21')
  assert.equal(dayFrom(today, 0), '2026-03-18')
})

test('the current month stops at today, so the ledger has no future movement', () => {
  const dates = demoMovements(today, 0).map((movement) => movement.date)
  assert.ok(dates.length > 0)
  assert.ok(dates.every((date) => date <= today))
  // The template's 28th is after the 18th, so the freelance income is not in this month yet.
  assert.ok(!dates.includes('2026-03-28'))
})

test('a past month carries the whole template', () => {
  const movements = demoMovements(today, 1)
  assert.equal(movements.length, 13)
  assert.equal(movements[0]?.date, '2026-02-01')
  assert.equal(movements.at(-1)?.date, '2026-02-28')
  // Money is always positive; the type carries the sign.
  assert.ok(movements.every((movement) => movement.amount > 0))
})

test('the transfers of a month are the savings and the card payment', () => {
  assert.deepEqual(demoTransfers(today, 1), [
    { date: '2026-02-02', to: 'savings', amount: 400 },
    { date: '2026-02-10', to: 'card', amount: 260 },
  ])
  // The 2nd and the 10th have passed in the current month, so both are there too.
  assert.equal(demoTransfers(today, 0).length, 2)
})

test('a month whose days have not come yet carries no transfer', () => {
  const early = '2026-03-01'
  assert.deepEqual(demoTransfers(early, 0), [])
})
