import assert from 'node:assert/strict'
import { test } from 'node:test'
import { expiredPushStatus } from './expired-push-status.ts'

test('a gone endpoint is 404 or 410', () => {
  assert.equal(expiredPushStatus(404), true)
  assert.equal(expiredPushStatus(410), true)
})

test('any other status keeps the subscription', () => {
  assert.equal(expiredPushStatus(201), false)
  assert.equal(expiredPushStatus(429), false)
  assert.equal(expiredPushStatus(500), false)
})
