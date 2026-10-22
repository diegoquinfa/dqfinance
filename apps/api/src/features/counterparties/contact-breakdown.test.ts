import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contactCategories, contactTotals, offsetSecondsAt } from './contact-breakdown.ts'

test('the month bucket uses the offset of the user zone, not UTC', () => {
  // The first instant of 2026-10-21 in each zone: the offset its month bucket shifts by.
  assert.equal(offsetSecondsAt('America/Bogota', new Date('2026-10-21T05:00:00Z')), -18_000)
  assert.equal(offsetSecondsAt('Asia/Tokyo', new Date('2026-10-20T15:00:00Z')), 32_400)
  // Daylight saving time: the offset in effect, not the winter one.
  assert.equal(offsetSecondsAt('America/New_York', new Date('2026-07-01T04:00:00Z')), -14_400)
  assert.equal(offsetSecondsAt('America/New_York', new Date('2026-12-01T05:00:00Z')), -18_000)
})

test('totals keep one line per currency', () => {
  const result = contactTotals([
    { currency: 'COP', spentCents: 500_000, receivedCents: 0, movements: 2, expenses: 2, firstAt: 1, lastAt: 2 },
    { currency: 'USD', spentCents: 1_000, receivedCents: 2_000, movements: 2, expenses: 1, firstAt: 1, lastAt: 3 },
  ])
  assert.equal(result.totals.length, 2)
  assert.deepEqual(result.totals[0]!, { currency: 'COP', spent: 5000, received: 0, average: 2500 })
  assert.deepEqual(result.totals[1]!, { currency: 'USD', spent: 10, received: 20, average: 10 })
})

test('the movements and the dates cover every currency', () => {
  const result = contactTotals([
    { currency: 'COP', spentCents: 100, receivedCents: 0, movements: 1, expenses: 1, firstAt: 1_700, lastAt: 1_800 },
    { currency: 'USD', spentCents: 0, receivedCents: 50, movements: 3, expenses: 0, firstAt: 1_000, lastAt: 1_500 },
  ])
  assert.equal(result.movements, 4)
  assert.equal(result.firstMovementAt, new Date(1_000).toISOString())
  assert.equal(result.lastMovementAt, new Date(1_800).toISOString())
})

test('a currency with no spending has no average', () => {
  const result = contactTotals([
    { currency: 'COP', spentCents: 0, receivedCents: 1_000, movements: 1, expenses: 0, firstAt: 1, lastAt: 1 },
  ])
  assert.equal(result.totals[0]!.average, null)
})

test('no movements means no dates', () => {
  const result = contactTotals([])
  assert.deepEqual(result.totals, [])
  assert.equal(result.movements, 0)
  assert.equal(result.firstMovementAt, null)
  assert.equal(result.lastMovementAt, null)
})

test('the categories come biggest first', () => {
  const rows = [
    { categoryId: 'a', categoryName: 'Services', categorySystemKey: null, categoryKind: 'expense' as const, currency: 'COP', amountCents: 100, movements: 1 },
    { categoryId: 'b', categoryName: 'Rent', categorySystemKey: null, categoryKind: 'expense' as const, currency: 'COP', amountCents: 900, movements: 3 },
  ]
  const result = contactCategories(rows, 'es')
  assert.deepEqual(
    result.map((entry) => entry.categoryId),
    ['b', 'a'],
  )
  assert.equal(result[0]!.amount, 9)
})

test('a system category is translated and a movement without one is left out', () => {
  const rows = [
    { categoryId: 'sys', categoryName: null, categorySystemKey: 'other_expense' as const, categoryKind: 'expense' as const, currency: 'COP', amountCents: 100, movements: 1 },
    { categoryId: null, categoryName: null, categorySystemKey: null, categoryKind: null, currency: 'COP', amountCents: 100, movements: 1 },
  ]
  const result = contactCategories(rows, 'es')
  assert.equal(result.length, 1)
  assert.equal(result[0]!.name, 'Otros gastos')
})
