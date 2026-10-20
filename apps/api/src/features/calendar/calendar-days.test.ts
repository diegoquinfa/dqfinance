import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupByDay, projectDueDates, shiftDay } from './calendar-days.ts'

test('shiftDay crosses month and year ends', () => {
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
})

test('groupByDay uses the user timezone, not UTC', () => {
  // 23:30 in Bogotá (UTC−5) is already the next day in UTC.
  const rows = [{ type: 'expense' as const, currency: 'COP', cents: 4_500_000, occurredAt: new Date('2026-10-15T04:30:00Z') }]
  assert.deepEqual(groupByDay(rows, 'America/Bogota', '2026-10-01', '2026-11-01'), [
    { day: '2026-10-14', currency: 'COP', spent: 45_000, received: 0 },
  ])
})

test('groupByDay sums per day and currency, and drops days outside the range', () => {
  const at = (iso: string) => new Date(iso)
  const rows = [
    { type: 'expense' as const, currency: 'COP', cents: 1000, occurredAt: at('2026-10-02T15:00:00Z') },
    { type: 'expense' as const, currency: 'COP', cents: 500, occurredAt: at('2026-10-02T18:00:00Z') },
    { type: 'income' as const, currency: 'COP', cents: 2000, occurredAt: at('2026-10-02T19:00:00Z') },
    { type: 'expense' as const, currency: 'USD', cents: 300, occurredAt: at('2026-10-02T19:00:00Z') },
    { type: 'expense' as const, currency: 'COP', cents: 999, occurredAt: at('2026-09-30T15:00:00Z') },
    { type: 'expense' as const, currency: 'COP', cents: 999, occurredAt: at('2026-11-01T15:00:00Z') },
  ]
  assert.deepEqual(groupByDay(rows, 'UTC', '2026-10-01', '2026-11-01'), [
    { day: '2026-10-02', currency: 'COP', spent: 15, received: 20 },
    { day: '2026-10-02', currency: 'USD', spent: 3, received: 0 },
  ])
})

test('projectDueDates repeats a weekly item across the range', () => {
  const item = { startsOn: '2026-09-25', nextDueOn: '2026-10-30', frequency: 'weekly' as const }
  assert.deepEqual(projectDueDates(item, '2026-11-01', '2026-12-01'), ['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27'])
})

test('projectDueDates keeps the start day of a monthly item, clamped', () => {
  const item = { startsOn: '2026-01-31', nextDueOn: '2026-01-31', frequency: 'monthly' as const }
  assert.deepEqual(projectDueDates(item, '2026-02-01', '2026-04-01'), ['2026-02-28', '2026-03-31'])
})

test('projectDueDates keeps an overdue date and skips items past the range', () => {
  const overdue = { startsOn: '2026-10-05', nextDueOn: '2026-10-05', frequency: 'monthly' as const }
  assert.deepEqual(projectDueDates(overdue, '2026-10-01', '2026-11-01'), ['2026-10-05'])
  const later = { startsOn: '2027-01-10', nextDueOn: '2027-01-10', frequency: 'yearly' as const }
  assert.deepEqual(projectDueDates(later, '2026-10-01', '2026-11-01'), [])
})
