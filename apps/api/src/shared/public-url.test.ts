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

test('an IPv4-mapped IPv6 literal is judged by the IPv4 it carries', () => {
  // The URL parser rewrites the dotted form to hex, so both spellings arrive as hex.
  assert.equal(publicUrl('https://[::ffff:127.0.0.1]/push'), null)
  assert.equal(publicUrl('https://[::ffff:7f00:1]/push'), null)
  assert.equal(publicUrl('https://[0:0:0:0:0:ffff:7f00:1]/push'), null)
  assert.equal(publicHost('::ffff:10.0.0.1'), false)
  assert.equal(publicUrl('https://[::ffff:808:808]/push')?.hostname, '[::ffff:808:808]')
})

test('NAT64 and 6to4 literals do not smuggle a private IPv4', () => {
  assert.equal(publicUrl('https://[64:ff9b::7f00:1]/push'), null)
  assert.equal(publicUrl('https://[64:ff9b:1::a00:1]/push'), null)
  assert.equal(publicUrl('https://[2002:7f00:1::]/push'), null)
  assert.equal(publicUrl('https://[2002:a00:1::]/push'), null)
  // A 6to4 literal that carries a public IPv4 is still public.
  assert.equal(publicUrl('https://[2002:808:808::]/push')?.hostname, '[2002:808:808::]')
  // A NAT64 literal that carries a public IPv4 is still public.
  assert.equal(publicUrl('https://[64:ff9b::808:808]/push')?.hostname, '[64:ff9b::808:808]')
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
  assert.equal(publicHost('[2606:4700::1111]'), true)
})
