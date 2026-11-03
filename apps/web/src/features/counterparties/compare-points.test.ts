import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparePoints, type CompareContact } from './compare-points.ts'

const monthly = (rows: [string, string, number, number][]) =>
  rows.map(([month, currency, spent, received]) => ({ month, currency, spent, received }))

const contacts: CompareContact[] = [
  { id: 'didi', name: 'DiDi', monthly: monthly([['2026-09', 'COP', 100, 0], ['2026-10', 'COP', 50.5, 0]]) },
  { id: 'uber', name: 'Uber', monthly: monthly([['2026-10', 'COP', 20.25, 30], ['2026-10', 'USD', 9, 0]]) },
]

test('one point per month and contact, with the total between them in cents', () => {
  const points = comparePoints(contacts, 'COP', 'spent', (month) => month)
  assert.deepEqual(points, [
    { month: '2026-09', label: '2026-09', total: 100, didi: 100, uber: 0 },
    { month: '2026-10', label: '2026-10', total: 70.75, didi: 50.5, uber: 20.25 },
  ])
})

test('a month one contact does not have counts as zero, and another currency is left out', () => {
  const points = comparePoints(contacts, 'COP', 'received', (month) => month)
  assert.deepEqual(
    points.map((point) => [point.month, point.didi, point.uber, point.total]),
    [
      ['2026-09', 0, 0, 0],
      ['2026-10', 0, 30, 30],
    ],
  )
})

test('the total adds cents, so a tenth of a tenth does not drift', () => {
  const tenths: CompareContact[] = [0.1, 0.2].map((amount, index) => ({
    id: `contact-${index}`,
    name: `Contact ${index}`,
    monthly: monthly([['2026-10', 'COP', amount, 0]]),
  }))
  const [point] = comparePoints(tenths, 'COP', 'spent', (month) => month)
  assert.equal(point?.total, 0.3)
})

test('the label comes from the caller', () => {
  const [first] = comparePoints(contacts, 'COP', 'spent', () => 'sep')
  assert.equal(first?.label, 'sep')
})
