import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dailyPaceCents, projectBalances } from './forecast.ts'

test('the first point is the balance today', () => {
  const { points } = projectBalances(100000, [{ day: '2026-10-22', incomeCents: 0, expenseCents: 0 }])
  assert.equal(points[0]!.balanceCents, 100000)
})

test('a bill lowers the line from the day it falls due', () => {
  const { points } = projectBalances(100000, [
    { day: '2026-10-22', incomeCents: 0, expenseCents: 0 },
    { day: '2026-10-23', incomeCents: 0, expenseCents: 30000 },
    { day: '2026-10-24', incomeCents: 0, expenseCents: 0 },
  ])
  assert.deepEqual(
    points.map((point) => point.balanceCents),
    [100000, 70000, 70000],
  )
})

test('an income raises the line', () => {
  const { points } = projectBalances(0, [{ day: '2026-10-22', incomeCents: 500000, expenseCents: 0 }])
  assert.equal(points[0]!.balanceCents, 500000)
})

test('the lowest point is the day the money runs out', () => {
  const { lowest } = projectBalances(100000, [
    { day: '2026-10-22', incomeCents: 0, expenseCents: 0 },
    { day: '2026-10-23', incomeCents: 0, expenseCents: 60000 },
    { day: '2026-10-24', incomeCents: 0, expenseCents: 0 },
    { day: '2026-10-25', incomeCents: 90000, expenseCents: 0 },
  ])
  assert.equal(lowest?.day, '2026-10-23')
  assert.equal(lowest?.balanceCents, 40000)
})

test('the balance can go below zero', () => {
  const { lowest } = projectBalances(10000, [{ day: '2026-10-22', incomeCents: 0, expenseCents: 50000 }])
  assert.equal(lowest?.balanceCents, -40000)
})

test('no days means no lowest point', () => {
  const { points, lowest } = projectBalances(100000, [])
  assert.deepEqual(points, [])
  assert.equal(lowest, null)
})

test('the pace is spent from tomorrow on, not today', () => {
  const { points } = projectBalances(
    100000,
    [
      { day: '2026-10-22', incomeCents: 0, expenseCents: 0 },
      { day: '2026-10-23', incomeCents: 0, expenseCents: 0 },
      { day: '2026-10-24', incomeCents: 0, expenseCents: 0 },
    ],
    { today: '2026-10-22', dailyCents: 10000 },
  )
  assert.deepEqual(
    points.map((point) => point.balanceCents),
    [100000, 90000, 80000],
  )
})

test('a pace of zero leaves the line as it was', () => {
  const days = [
    { day: '2026-10-22', incomeCents: 0, expenseCents: 0 },
    { day: '2026-10-23', incomeCents: 0, expenseCents: 30000 },
  ]
  assert.deepEqual(projectBalances(100000, days, { today: '2026-10-22', dailyCents: 0 }), projectBalances(100000, days))
})

test('the pace is the spending so far over the days elapsed, rounded down and never negative', () => {
  assert.equal(dailyPaceCents(3_000_000, 15), 200_000)
  assert.equal(dailyPaceCents(1_000_000, 15), 66_666)
  assert.equal(dailyPaceCents(500, 1), 500)
  assert.equal(dailyPaceCents(0, 15), 0)
  assert.equal(dailyPaceCents(-500, 2), 0)
})
