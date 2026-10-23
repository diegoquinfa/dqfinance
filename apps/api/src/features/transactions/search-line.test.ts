import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchLine, type SearchRow } from './search-line.ts'

const BOGOTA = 'America/Bogota'

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
  assert.equal(searchLine(row(), BOGOTA), '2026-10-18 | expense | 45000.5 COP | Comida | Web Sunday | tx-1')
})

test('the description stands in when the movement has no title', () => {
  assert.equal(
    searchLine(row({ title: null, description: 'Almuerzo' }), BOGOTA),
    '2026-10-18 | expense | 45000.5 COP | Comida | Almuerzo | tx-1',
  )
})

test('a movement with no name at all keeps the shape of the line', () => {
  assert.equal(
    searchLine(row({ title: null, description: null }), BOGOTA),
    '2026-10-18 | expense | 45000.5 COP | Comida | - | tx-1',
  )
})

test('an income says so', () => {
  assert.match(searchLine(row({ type: 'income' }), BOGOTA), /\| income \|/)
})

test('the day is the user timezone, not UTC: 21:00 in Bogota on the 30th is the 30th', () => {
  assert.equal(
    searchLine(row({ occurredAt: '2026-10-31T02:00:00.000Z' }), BOGOTA).slice(0, 10),
    '2026-10-30',
  )
})

test('a newline or a pipe in free text cannot forge a second line or a field', () => {
  const line = searchLine(row({ title: 'a\nb | c', category: { name: 'x\r|y' } }), BOGOTA)
  assert.equal(line.includes('\n'), false)
  assert.equal(line.includes('\r'), false)
  assert.equal(line.split(' | ').length, 6)
  assert.equal(line, '2026-10-18 | expense | 45000.5 COP | x  y | a b   c | tx-1')
})
