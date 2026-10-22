import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayRangeIn, startOfDayIn } from './day-range.ts'

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
