import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bpsToPercent, percentToBps } from './rates.ts'

test('percentToBps rounds to the basis point', () => {
  assert.equal(percentToBps(12), 1200)
  assert.equal(percentToBps(12.5), 1250)
  assert.equal(percentToBps(12.345), 1235)
  assert.equal(percentToBps(0.004), 0)
  assert.equal(percentToBps(0), 0)
})

test('bpsToPercent is the inverse of percentToBps', () => {
  assert.equal(bpsToPercent(1250), 12.5)
  assert.equal(bpsToPercent(percentToBps(19.995)), 20)
})
