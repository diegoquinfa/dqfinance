import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchLine, type SearchRow } from './search-line.ts'

const row = (over: Partial<SearchRow> = {}): SearchRow => ({
  id: 'tx-1',
  type: 'expense',
  amount: 45000.5,
  currency: 'COP',
  category: { name: 'Comida' },
  title: 'Web Sunday',
  description: null,
  occurredAt: '2026-10-18T13:20:00.000Z',
  ...over,
})

test('a line holds the day, the amount, the category, the name and the id', () => {
  assert.equal(searchLine(row()), '2026-10-18 | expense | 45000.5 COP | Comida | Web Sunday | tx-1')
})

test('the description stands in when the movement has no title', () => {
  assert.equal(
    searchLine(row({ title: null, description: 'Almuerzo' })),
    '2026-10-18 | expense | 45000.5 COP | Comida | Almuerzo | tx-1',
  )
})

test('a movement with no name at all keeps the shape of the line', () => {
  assert.equal(
    searchLine(row({ title: null, description: null })),
    '2026-10-18 | expense | 45000.5 COP | Comida | - | tx-1',
  )
})

test('an income says so', () => {
  assert.match(searchLine(row({ type: 'income' })), /\| income \|/)
})
