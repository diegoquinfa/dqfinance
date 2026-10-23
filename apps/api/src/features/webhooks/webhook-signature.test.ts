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

test('the header is the time and the signature over the time and the body', async () => {
  const header = await signatureHeader('shhh', 'body', 1_700_000_000)
  assert.equal(header, `t=1700000000,v1=${await signBody('shhh', '1700000000.body')}`)
})

test('another time signs differently, so a captured call cannot be replayed with a new time', async () => {
  const signatureAt = async (time: number) => (await signatureHeader('shhh', 'body', time)).split(',v1=')[1]
  assert.notEqual(await signatureAt(1_700_000_000), await signatureAt(1_700_000_001))
})

test('the header carries the time and a version', async () => {
  assert.match(await signatureHeader('shhh', 'body'), /^t=\d+,v1=[0-9a-f]{64}$/)
})
