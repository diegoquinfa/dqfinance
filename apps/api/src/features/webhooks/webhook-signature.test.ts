import assert from 'node:assert/strict'
import { test } from 'node:test'
import { signBody, signatureHeader } from './webhook-signature.ts'

test('the same body and secret always sign the same way', async () => {
  const first = await signBody('shhh', '{"event":"bill.due"}')
  const second = await signBody('shhh', '{"event":"bill.due"}')
  assert.equal(first, second)
  assert.equal(first.length, 64)
})

test('another body signs differently', async () => {
  assert.notEqual(await signBody('shhh', '{"a":1}'), await signBody('shhh', '{"a":2}'))
})

test('another secret signs differently', async () => {
  assert.notEqual(await signBody('shhh', '{"a":1}'), await signBody('other', '{"a":1}'))
})

test('the header names the algorithm', async () => {
  const header = await signatureHeader('shhh', 'body')
  assert.match(header, /^sha256=[0-9a-f]{64}$/)
})
