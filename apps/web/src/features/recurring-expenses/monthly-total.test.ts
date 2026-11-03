import assert from 'node:assert/strict'
import { test } from 'node:test'
import { monthlyTotal } from './monthly-total.ts'

const row = (amount: number, frequency: string, extra: { currency?: string; active?: boolean } = {}) => ({
  amount,
  currency: extra.currency ?? 'COP',
  frequency,
  active: extra.active,
})

test('monthly rows add up as they are', () => {
  assert.deepEqual(monthlyTotal([row(21_972, 'monthly'), row(8_900, 'monthly'), row(16_333, 'monthly')]), [
    { currency: 'COP', amount: 47_205 },
  ])
})

test('a weekly row counts 52/12 a month, a yearly one a twelfth, a biweekly one 26/12', () => {
  assert.deepEqual(monthlyTotal([row(12_000, 'weekly')]), [{ currency: 'COP', amount: 52_000 }])
  assert.deepEqual(monthlyTotal([row(120_000, 'yearly')]), [{ currency: 'COP', amount: 10_000 }])
  assert.deepEqual(monthlyTotal([row(12_000, 'biweekly')]), [{ currency: 'COP', amount: 26_000 }])
})

test('an irregular row has no month to land on, and an inactive one costs nothing', () => {
  assert.deepEqual(monthlyTotal([row(5000, 'irregular')]), [])
  assert.deepEqual(monthlyTotal([row(5000, 'monthly', { active: false })]), [])
})

test('currencies never mix, and the biggest month leads', () => {
  assert.deepEqual(monthlyTotal([row(10, 'monthly'), row(300, 'monthly', { currency: 'USD' })]), [
    { currency: 'USD', amount: 300 },
    { currency: 'COP', amount: 10 },
  ])
})

test('the sum goes through cents, so a third of a weight does not drift', () => {
  assert.deepEqual(monthlyTotal([row(0.1, 'monthly'), row(0.2, 'monthly')]), [{ currency: 'COP', amount: 0.3 }])
})
