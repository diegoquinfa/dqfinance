import assert from 'node:assert/strict'
import { test } from 'node:test'
import { settleForeignDebt } from './fx-settlement.ts'

test('paying all foreign debt at a worse rate books the extra as an FX loss', () => {
  // 5 USD bought for 20,000 COP; paid with 21,000 COP.
  assert.deepEqual(settleForeignDebt({ outstandingUnits: 500, outstandingBasis: 2_000_000, paidUnits: 500, paidPrimary: 2_100_000 }), {
    costBasis: 2_000_000,
    difference: 100_000,
  })
})

test('a better rate is an FX gain', () => {
  assert.deepEqual(settleForeignDebt({ outstandingUnits: 500, outstandingBasis: 2_000_000, paidUnits: 500, paidPrimary: 1_900_000 }), {
    costBasis: 2_000_000,
    difference: -100_000,
  })
})

test('a partial payment releases cost basis at the average purchase rate', () => {
  // 10 USD with 42,000 COP basis (avg 4,200); pay 4 USD with 17,000 COP.
  assert.deepEqual(settleForeignDebt({ outstandingUnits: 1_000, outstandingBasis: 4_200_000, paidUnits: 400, paidPrimary: 1_700_000 }), {
    costBasis: 1_680_000,
    difference: 20_000,
  })
})

test('paying more than the outstanding debt values the excess at the payment rate', () => {
  // Owes 2 USD (8,000 basis); pays 4 USD with 16,400 → 2 USD covered, 2 USD prepaid at 4,100.
  assert.deepEqual(settleForeignDebt({ outstandingUnits: 200, outstandingBasis: 800_000, paidUnits: 400, paidPrimary: 1_640_000 }), {
    costBasis: 800_000 + 820_000,
    difference: 20_000,
  })
})

test('a prepayment with no debt has no FX difference', () => {
  assert.deepEqual(settleForeignDebt({ outstandingUnits: 0, outstandingBasis: 0, paidUnits: 300, paidPrimary: 1_230_000 }), {
    costBasis: 1_230_000,
    difference: 0,
  })
})
