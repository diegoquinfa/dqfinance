import assert from 'node:assert/strict'
import { test } from 'node:test'
import { netWorth, totalsIn } from './totals.ts'

test('period totals sum one currency in cents', () => {
  const rows = [
    { type: 'income' as const, currency: 'COP', amount: 0.1 },
    { type: 'income' as const, currency: 'COP', amount: 0.2 },
    { type: 'expense' as const, currency: 'COP', amount: 45000.5 },
    { type: 'expense' as const, currency: 'USD', amount: 9 },
  ]
  assert.deepEqual(totalsIn(rows, 'COP'), { income: 0.3, expense: 45000.5, net: -45000.2 })
  assert.deepEqual(totalsIn(rows, 'EUR'), { income: 0, expense: 0, net: 0 })
})

test('net worth keeps currencies apart and lists the primary first', () => {
  const assets = [
    { currency: 'USD', balance: 10.1 },
    { currency: 'COP', balance: 20000 },
    { currency: 'COP', balance: 0.2 },
  ]
  const debts = [
    { currency: 'COP', amount: 5000.1 },
    { currency: 'EUR', amount: 3 },
  ]
  assert.deepEqual(netWorth(assets, debts, 'COP'), [
    { currency: 'COP', assets: 20000.2, liabilities: 5000.1, net: 15000.1 },
    { currency: 'EUR', assets: 0, liabilities: 3, net: -3 },
    { currency: 'USD', assets: 10.1, liabilities: 0, net: 10.1 },
  ])
  assert.deepEqual(netWorth([], [], 'COP'), [{ currency: 'COP', assets: 0, liabilities: 0, net: 0 }])
})
