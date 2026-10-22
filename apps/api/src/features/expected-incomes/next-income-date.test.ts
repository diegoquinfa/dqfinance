import assert from 'node:assert/strict'
import { test } from 'node:test'
import { incomeDatesIn, nextIncomeDate } from './next-income-date.ts'

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

test('an irregular income arrives once, not on every day after its date', () => {
  assert.deepEqual(incomeDatesIn('irregular', '2026-10-25', '2026-10-25', '2026-10-31'), ['2026-10-25'])
})

test('an irregular income whose date already passed arrives once', () => {
  assert.deepEqual(incomeDatesIn('irregular', '2026-10-05', '2026-10-22', '2026-10-31'), ['2026-10-22'])
})

test('a weekly income arrives on each of its dates in the range', () => {
  assert.deepEqual(incomeDatesIn('weekly', '2026-10-02', '2026-10-22', '2026-10-31'), ['2026-10-23', '2026-10-30'])
})

test('a monthly income arrives once a month', () => {
  assert.deepEqual(incomeDatesIn('monthly', '2026-10-30', '2026-10-30', '2026-11-30'), ['2026-10-30', '2026-11-30'])
})

test('an income that does not fall in the range is not listed', () => {
  assert.deepEqual(incomeDatesIn('monthly', '2026-10-30', '2026-10-22', '2026-10-29'), [])
})

test('a salary and an irregular invoice bring 5,500,000 in the rest of the month', () => {
  // The review's case: 5,000,000 monthly on the 30th and 500,000 irregular on the 25th.
  const salary = incomeDatesIn('monthly', '2026-10-30', '2026-10-30', '2026-10-31')
  const invoice = incomeDatesIn('irregular', '2026-10-25', '2026-10-25', '2026-10-31')
  const cents = salary.length * 5_000_000 + invoice.length * 500_000
  assert.equal(cents, 5_500_000)
})
