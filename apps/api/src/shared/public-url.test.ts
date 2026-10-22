import assert from 'node:assert/strict'
import { test } from 'node:test'
import { publicHost, publicUrl } from './public-url.ts'

test('a public https endpoint is accepted', () => {
  const url = publicUrl('https://fcm.googleapis.com/fcm/send/abc123')
  assert.equal(url?.hostname, 'fcm.googleapis.com')
})

test('plain http is rejected', () => {
  assert.equal(publicUrl('http://example.com/push'), null)
})

test('loopback and private hosts are rejected', () => {
  assert.equal(publicUrl('https://localhost/push'), null)
  assert.equal(publicUrl('https://127.0.0.1/push'), null)
  assert.equal(publicUrl('https://169.254.169.254/push'), null)
  assert.equal(publicUrl('https://10.0.0.1/push'), null)
  assert.equal(publicUrl('https://[::1]/push'), null)
})

test('local names are rejected', () => {
  assert.equal(publicHost('localhost'), false)
  assert.equal(publicHost('app.localhost'), false)
  assert.equal(publicHost('printer.local'), false)
  assert.equal(publicHost('metadata.google.internal'), false)
})

test('a public host is accepted', () => {
  assert.equal(publicUrl('https://example.com/push')?.hostname, 'example.com')
  assert.equal(publicHost('example.com'), true)
})
