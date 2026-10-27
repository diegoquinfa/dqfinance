import assert from 'node:assert/strict'
import { test } from 'node:test'
import { axisSignificantDigits } from './axis-digits.ts'

test('a narrow range around a large balance gets the digits that tell the ticks apart', () => {
  assert.equal(axisSignificantDigits([-5_277_385, -5_387_446], 4), 4)
})

test('a range from zero reads with two digits', () => {
  assert.equal(axisSignificantDigits([0, 1_200_000], 4), 2)
})

test('a flat line or an empty scale falls back to two digits', () => {
  assert.equal(axisSignificantDigits([5_000, 5_000], 4), 2)
  assert.equal(axisSignificantDigits([0, 0], 4), 2)
})
