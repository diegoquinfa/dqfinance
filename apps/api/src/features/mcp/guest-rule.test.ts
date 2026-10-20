import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blocksMcp } from './guest-rule.ts'

test('a guest may not reach the tools', () => {
  assert.equal(blocksMcp({ isAnonymous: true }), true)
})

test('an account may', () => {
  assert.equal(blocksMcp({ isAnonymous: false }), false)
  // The column is nullable, so a row without it is a normal account.
  assert.equal(blocksMcp({ isAnonymous: null }), false)
  assert.equal(blocksMcp({}), false)
})

test('a user that no longer exists owns nothing, so its token is stale', () => {
  assert.equal(blocksMcp(undefined), true)
})
