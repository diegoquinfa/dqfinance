import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextIncomeDate } from './next-income-date.ts'

test('a weekly income keeps its weekday', () => {
  assert.equal(nextIncomeDate('weekly', '2026-10-02', '2026-10-22'), '2026-10-23')
  assert.equal(nextIncomeDate('weekly', '2026-10-02', '2026-10-23'), '2026-10-23')
})

test('a fortnightly income comes every two weeks', () => {
  // The anchor is on the 2nd: the 16th and the 30th follow.
  assert.equal(nextIncomeDate('biweekly', '2026-10-02', '2026-10-20'), '2026-10-30')
  assert.equal(nextIncomeDate('biweekly', '2026-10-02', '2026-10-16'), '2026-10-16')
})

test('a monthly income keeps its day, clamped to the short months', () => {
  assert.equal(nextIncomeDate('monthly', '2026-01-31', '2026-02-01'), '2026-02-28')
  assert.equal(nextIncomeDate('monthly', '2026-01-31', '2026-03-01'), '2026-03-31')
})

test('an irregular income arrives when the user says it does', () => {
  assert.equal(nextIncomeDate('irregular', '2026-10-05', '2026-10-22'), '2026-10-22')
  assert.equal(nextIncomeDate('irregular', '2026-11-05', '2026-10-22'), '2026-11-05')
})

test('an old anchor moves forward to the next occurrence', () => {
  assert.equal(nextIncomeDate('weekly', '2020-01-03', '2026-10-22'), '2026-10-23')
})
