import assert from 'node:assert/strict'
import { test } from 'node:test'
import { guestCutoff } from './guest-retention.ts'

test('a guest is kept for seven days after it was created', () => {
  assert.equal(guestCutoff(new Date('2026-10-23T13:17:00.000Z')).toISOString(), '2026-10-16T13:17:00.000Z')
})
