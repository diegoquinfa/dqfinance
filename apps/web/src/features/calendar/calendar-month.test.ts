import assert from 'node:assert/strict'
import { test } from 'node:test'
import { monthGrid, monthTotals, shiftDay } from './calendar-month.ts'

test('monthGrid starts on Monday and pads whole weeks', () => {
  // October 2026 starts on a Thursday and has 31 days.
  const grid = monthGrid(0, new Date(2026, 9, 19))
  assert.equal(grid.from, '2026-10-01')
  assert.equal(grid.to, '2026-11-01')
  assert.deepEqual(grid.cells.slice(0, 4), [null, null, null, '2026-10-01'])
  assert.equal(grid.cells.length, 35)
  assert.equal(grid.cells.at(-1), null)
  assert.equal(grid.cells.filter(Boolean).length, 31)
})

test('monthGrid moves across years', () => {
  const grid = monthGrid(3, new Date(2026, 9, 19))
  assert.equal(grid.from, '2027-01-01')
  assert.equal(grid.to, '2027-02-01')
})

test('shiftDay crosses month ends', () => {
  assert.equal(shiftDay('2026-10-31', 1), '2026-11-01')
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
})

test('monthTotals sums one currency without float drift', () => {
  const days = [
    { currency: 'USD', spent: 0.1, received: 0 },
    { currency: 'USD', spent: 0.2, received: 5 },
    { currency: 'COP', spent: 1000, received: 0 },
  ]
  const due = [
    { currency: 'USD', amount: 9.99 },
    { currency: 'COP', amount: 50_000 },
  ]
  assert.deepEqual(monthTotals(days, due, 'USD'), { spent: 0.3, received: 5, due: 9.99 })
})
