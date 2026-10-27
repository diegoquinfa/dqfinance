import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayOfMonth, dueOnAfter, lastCutOn, remainingCents } from './statement-dates.ts'

test('a day past the end of the month is clamped to its last day', () => {
  assert.equal(dayOfMonth('2026-11', 31), '2026-11-30')
  assert.equal(dayOfMonth('2028-02', 30), '2028-02-29')
  assert.equal(dayOfMonth('2026-10', 5), '2026-10-05')
})

test('the last cut is this month once its day has passed, else the previous month', () => {
  assert.equal(lastCutOn('2026-10-27', 20), '2026-10-20')
  assert.equal(lastCutOn('2026-10-27', 30), '2026-09-30')
  // On the cut day the statement is still open.
  assert.equal(lastCutOn('2026-10-30', 30), '2026-09-30')
  assert.equal(lastCutOn('2026-10-31', 30), '2026-10-30')
  assert.equal(lastCutOn('2026-01-10', 30), '2025-12-30')
  // A cut on the 30th closes on the last day of February.
  assert.equal(lastCutOn('2026-03-01', 30), '2026-02-28')
})

test('the payment falls after the cut, in the same month or the next one', () => {
  assert.equal(dueOnAfter('2026-09-30', 15), '2026-10-15')
  assert.equal(dueOnAfter('2026-10-05', 20), '2026-10-20')
  assert.equal(dueOnAfter('2026-10-20', 20), '2026-11-20')
  assert.equal(dueOnAfter('2026-12-30', 14), '2027-01-14')
  assert.equal(dueOnAfter('2026-01-15', 31), '2026-01-31')
})

test('what reached the card after the cut lowers the payment, never below zero', () => {
  assert.equal(remainingCents(41_230_000, 0), 41_230_000)
  assert.equal(remainingCents(41_230_000, 10_000_000), 31_230_000)
  assert.equal(remainingCents(41_230_000, 50_000_000), 0)
})
