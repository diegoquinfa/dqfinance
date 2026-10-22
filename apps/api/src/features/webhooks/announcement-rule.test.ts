import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isAnnounced } from './announcement-rule.ts'

test('a bill no hook received is not announced', () => {
  // No active hook at all, or every call failed: the due date stays open for the next check.
  assert.equal(isAnnounced(0), false)
})

test('a bill one hook received is announced', () => {
  assert.equal(isAnnounced(1), true)
})

test('a bill two hooks received is announced', () => {
  assert.equal(isAnnounced(2), true)
})
