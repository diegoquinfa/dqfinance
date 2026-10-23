import assert from 'node:assert/strict'
import { test } from 'node:test'
import { overspendKey } from './overspend-key.ts'

test('over the money says so, even when the target is over too', () => {
  assert.equal(overspendKey({ daily: -3, targetDaily: -1 }), 'spending_over_money')
  assert.equal(overspendKey({ daily: -3, targetDaily: null }), 'spending_over_money')
})

test('over the monthly target alone says that', () => {
  assert.equal(overspendKey({ daily: 10, targetDaily: -1 }), 'spending_over_target')
})

test('neither over says nothing, and a zero is not over', () => {
  assert.equal(overspendKey({ daily: 10, targetDaily: 5 }), null)
  assert.equal(overspendKey({ daily: 0, targetDaily: 0 }), null)
  assert.equal(overspendKey({ daily: 10, targetDaily: null }), null)
})
