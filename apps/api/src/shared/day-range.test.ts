import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayRangeIn, startOfDayIn } from './day-range.ts'

/** The calendar date that reads at that instant in that timezone, e.g. '2026-03-08'. */
const dayOf = (timeZone: string, instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

test('the day starts at the local midnight of that timezone', () => {
  assert.equal(startOfDayIn('America/Bogota', '2026-10-21').toISOString(), '2026-10-21T05:00:00.000Z')
  assert.equal(startOfDayIn('Asia/Tokyo', '2026-10-21').toISOString(), '2026-10-20T15:00:00.000Z')
  assert.equal(startOfDayIn('UTC', '2026-10-21').toISOString(), '2026-10-21T00:00:00.000Z')
})

test('the day that changes its offset is still the local day', () => {
  // New York moves the clock on March 8 and November 1, 2026.
  assert.equal(startOfDayIn('America/New_York', '2026-03-08').toISOString(), '2026-03-08T05:00:00.000Z')
  assert.equal(startOfDayIn('America/New_York', '2026-11-01').toISOString(), '2026-11-01T04:00:00.000Z')
})

test('a day whose clock springs forward at midnight starts on its first instant', () => {
  // Havana, Santiago and the Azores move the clock from 00:00 to 01:00: there is no local midnight.
  assert.equal(startOfDayIn('America/Havana', '2026-03-08').toISOString(), '2026-03-08T05:00:00.000Z')
  assert.equal(startOfDayIn('America/Santiago', '2026-09-06').toISOString(), '2026-09-06T04:00:00.000Z')
  assert.equal(startOfDayIn('Atlantic/Azores', '2026-03-29').toISOString(), '2026-03-29T01:00:00.000Z')
  assert.equal(dayOf('America/Havana', startOfDayIn('America/Havana', '2026-03-08')), '2026-03-08')
  assert.equal(dayOf('America/Santiago', startOfDayIn('America/Santiago', '2026-09-06')), '2026-09-06')
  assert.equal(dayOf('Atlantic/Azores', startOfDayIn('Atlantic/Azores', '2026-03-29')), '2026-03-29')
})

test('the day that loses an hour still starts and ends on its own dates', () => {
  // Havana repeats 23:00 on November 1 and Santiago repeats 23:00 on April 5.
  assert.equal(startOfDayIn('America/Havana', '2026-11-01').toISOString(), '2026-11-01T04:00:00.000Z')
  assert.equal(startOfDayIn('America/Santiago', '2026-04-05').toISOString(), '2026-04-05T04:00:00.000Z')
  const range = dayRangeIn('America/Havana', '2026-03-08', '2026-03-09')
  assert.equal(range.start?.toISOString(), '2026-03-08T05:00:00.000Z')
  assert.equal(range.end?.toISOString(), '2026-03-09T04:00:00.000Z')
})

test('every date of 2026 starts on that date', () => {
  const zones = ['UTC', 'America/New_York', 'America/Havana', 'America/Santiago', 'Atlantic/Azores', 'Asia/Tokyo', 'Pacific/Auckland']
  const day = new Date(Date.UTC(2026, 0, 1))
  while (day.getUTCFullYear() === 2026) {
    const value = day.toISOString().slice(0, 10)
    for (const zone of zones) assert.equal(dayOf(zone, startOfDayIn(zone, value)), value)
    day.setUTCDate(day.getUTCDate() + 1)
  }
})

test('the range ends where the next day starts', () => {
  const range = dayRangeIn('America/Bogota', '2026-10-21', '2026-10-22')
  assert.equal(range.start?.toISOString(), '2026-10-21T05:00:00.000Z')
  assert.equal(range.end?.toISOString(), '2026-10-22T05:00:00.000Z')
})

test('a range without bounds is open', () => {
  const range = dayRangeIn('America/Bogota')
  assert.equal(range.start, null)
  assert.equal(range.end, null)
})
