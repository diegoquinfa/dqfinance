import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayIn, noonIn } from './zoned-day.ts'

test('noon in a zone is the instant its wall clock reads 12:00', () => {
  assert.equal(noonIn('America/Bogota', '2026-10-20'), '2026-10-20T17:00:00.000Z')
  assert.equal(noonIn('Asia/Tokyo', '2026-10-20'), '2026-10-20T03:00:00.000Z')
  assert.equal(noonIn('UTC', '2026-10-20'), '2026-10-20T12:00:00.000Z')
})

test('noon on a DST change day uses the offset in force at noon', () => {
  // New York springs forward on 8 March 2026 at 02:00, so noon is already EDT (UTC-4).
  assert.equal(noonIn('America/New_York', '2026-03-08'), '2026-03-08T16:00:00.000Z')
})

test('the day of an instant is the wall-clock day in the zone', () => {
  assert.equal(dayIn('America/Bogota', new Date('2026-10-21T02:00:00Z')), '2026-10-20')
  assert.equal(dayIn('Asia/Tokyo', new Date('2026-10-20T17:00:00Z')), '2026-10-21')
})

test('a noon picked in one zone reads back as the same day in that zone', () => {
  const iso = noonIn('Pacific/Kiritimati', '2026-10-20')
  assert.equal(dayIn('Pacific/Kiritimati', new Date(iso)), '2026-10-20')
  assert.equal(dayIn('America/Bogota', new Date(noonIn('America/Bogota', '2026-10-20'))), '2026-10-20')
})
