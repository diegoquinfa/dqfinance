import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeLike } from './escape-like.ts'

test('a wildcard in the search is a literal sign, not a match for everything', () => {
  assert.equal(escapeLike('%'), '\\%')
  assert.equal(escapeLike('_'), '\\_')
  assert.equal(escapeLike('\\'), '\\\\')
})

test('the rest of the search is left alone', () => {
  assert.equal(escapeLike('Web Sunday'), 'Web Sunday')
  assert.equal(escapeLike('100% café'), '100\\% café')
})
