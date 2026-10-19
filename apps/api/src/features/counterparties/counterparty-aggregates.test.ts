import assert from 'node:assert/strict'
import { test } from 'node:test'
import { counterpartyAggregates, type CounterpartyAggregateRow } from './counterparty-aggregates.ts'

const at = (iso: string) => Date.parse(iso)

const row = (over: Partial<CounterpartyAggregateRow> = {}): CounterpartyAggregateRow => ({
  id: 'c1',
  name: 'José',
  kind: 'person',
  currency: 'COP',
  spentCents: 4500050,
  receivedCents: 0,
  movements: 1,
  lastMovementAt: at('2026-10-14T20:30:00.000Z'),
  ...over,
})

/** The one contact the rows describe. */
const contact = (rows: CounterpartyAggregateRow[]) => {
  const [only] = counterpartyAggregates(rows)
  assert.ok(only)
  return only
}

test('a contact without movements is still listed, with nothing to show', () => {
  const listed = contact([
    row({ currency: null, spentCents: 0, receivedCents: 0, movements: 0, lastMovementAt: null }),
  ])
  assert.deepEqual(listed, {
    id: 'c1',
    name: 'José',
    kind: 'person',
    totals: [],
    movements: 0,
    lastMovementAt: null,
  })
})

test('expenses in two currencies are two totals, never one mixed amount', () => {
  const listed = contact([
    row({ currency: 'COP', spentCents: 4500050, movements: 1 }),
    row({ currency: 'USD', spentCents: 2500, movements: 1 }),
  ])
  assert.deepEqual(listed.totals, [
    { currency: 'COP', spent: 45000.5, received: 0 },
    { currency: 'USD', spent: 25, received: 0 },
  ])
  assert.equal(listed.movements, 2)
})

test('income and expense of the same currency are two sides of one total', () => {
  const listed = contact([row({ currency: 'COP', spentCents: 10000, receivedCents: 250000, movements: 2 })])
  assert.deepEqual(listed.totals, [{ currency: 'COP', spent: 100, received: 2500 }])
  assert.equal(listed.movements, 2)
})

test('the totals come ordered by currency', () => {
  const listed = contact([
    row({ currency: 'USD', spentCents: 100 }),
    row({ currency: 'COP', spentCents: 200 }),
    row({ currency: 'EUR', spentCents: 300 }),
  ])
  assert.deepEqual(
    listed.totals.map((total) => total.currency),
    ['COP', 'EUR', 'USD'],
  )
})

test('the last movement is the most recent one of any currency', () => {
  const listed = contact([
    row({ currency: 'COP', lastMovementAt: at('2026-10-14T20:30:00.000Z') }),
    row({ currency: 'USD', lastMovementAt: at('2026-10-18T08:00:00.000Z') }),
    row({ currency: 'EUR', lastMovementAt: at('2026-10-16T12:00:00.000Z') }),
  ])
  assert.equal(listed.lastMovementAt, '2026-10-18T08:00:00.000Z')
})

test('two contacts never merge and keep the order of the query', () => {
  const contacts = counterpartyAggregates([
    row({ id: 'c1', name: 'José', currency: null, spentCents: 0, receivedCents: 0, movements: 0, lastMovementAt: null }),
    row({ id: 'c2', name: 'Carulla', kind: 'business', currency: 'COP', spentCents: 5000, movements: 1 }),
  ])
  assert.deepEqual(
    contacts.map((each) => [each.id, each.name, each.movements]),
    [
      ['c1', 'José', 0],
      ['c2', 'Carulla', 1],
    ],
  )
})
