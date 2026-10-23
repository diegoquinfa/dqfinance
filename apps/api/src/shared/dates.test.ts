import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isTimeZone } from './dates.ts'

test('accepts IANA timezones and rejects anything else', () => {
  assert.equal(isTimeZone('America/Bogota'), true)
  assert.equal(isTimeZone('UTC'), true)
  assert.equal(isTimeZone('Mars/Olympus'), false)
  assert.equal(isTimeZone(''), false)
})
