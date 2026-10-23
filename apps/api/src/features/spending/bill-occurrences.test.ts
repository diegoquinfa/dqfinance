import assert from 'node:assert/strict'
import { test } from 'node:test'
import { billOccurrences } from './bill-occurrences.ts'

const monthly = { amountCents: 90000, startsOn: '2026-07-05', nextDueOn: '2026-07-05', frequency: 'monthly' as const }

test('an overdue monthly bill is owed once, today, and its missed cycles add nothing', () => {
  assert.deepEqual(billOccurrences(monthly, '2026-10-10', '2026-10-31'), [{ day: '2026-10-10', amountCents: 90000 }])
})

test('a weekly bill falls on each week until the end', () => {
  const weekly = { amountCents: 40000, startsOn: '2026-10-01', nextDueOn: '2026-10-12', frequency: 'weekly' as const }
  assert.deepEqual(billOccurrences(weekly, '2026-10-10', '2026-10-31'), [
    { day: '2026-10-12', amountCents: 40000 },
    { day: '2026-10-19', amountCents: 40000 },
    { day: '2026-10-26', amountCents: 40000 },
  ])
})

test('an overdue weekly bill is owed once today, then falls on the weeks still to come', () => {
  const weekly = { amountCents: 40000, startsOn: '2026-09-26', nextDueOn: '2026-09-26', frequency: 'weekly' as const }
  assert.deepEqual(billOccurrences(weekly, '2026-10-10', '2026-10-31').map((o) => o.day), [
    '2026-10-10',
    '2026-10-10',
    '2026-10-17',
    '2026-10-24',
    '2026-10-31',
  ])
})

test('a bill due after the end contributes nothing', () => {
  const later = { ...monthly, startsOn: '2026-11-02', nextDueOn: '2026-11-02' }
  assert.deepEqual(billOccurrences(later, '2026-10-10', '2026-10-31'), [])
})

test('a yearly bill due this month, after today, is one entry on its date', () => {
  const yearly = { amountCents: 120000, startsOn: '2025-10-20', nextDueOn: '2026-10-20', frequency: 'yearly' as const }
  assert.deepEqual(billOccurrences(yearly, '2026-10-10', '2026-10-31'), [{ day: '2026-10-20', amountCents: 120000 }])
})
