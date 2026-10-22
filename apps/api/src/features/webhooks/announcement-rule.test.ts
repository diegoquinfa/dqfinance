import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isAnnounced } from './announcement-rule.ts'

test('a bill no active hook exists for is not announced', () => {
  // Nothing is marked, so the bill fires once a hook exists.
  assert.equal(isAnnounced(0, 0), false)
})

test('a bill every hook failed on is not announced', () => {
  assert.equal(isAnnounced(0, 2), false)
})

test('a bill some hooks failed on is not announced', () => {
  // The whole bill is retried, so the failed hook gets another call.
  assert.equal(isAnnounced(1, 2), false)
})

test('a bill every hook received is announced', () => {
  assert.equal(isAnnounced(1, 1), true)
  assert.equal(isAnnounced(2, 2), true)
})
