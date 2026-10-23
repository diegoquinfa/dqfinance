import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blocksWebhooks } from './webhook-guest-rule.ts'

test('a guest may not set up or run webhooks', () => {
  assert.equal(blocksWebhooks({ isAnonymous: true }), true)
})

test('an account may, and so may a row without the column', () => {
  assert.equal(blocksWebhooks({ isAnonymous: false }), false)
  assert.equal(blocksWebhooks({ isAnonymous: null }), false)
  assert.equal(blocksWebhooks({}), false)
})
