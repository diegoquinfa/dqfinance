import assert from 'node:assert/strict'
import { test } from 'node:test'
import { duplicateFlags, type MovementFingerprint } from './duplicate.ts'

const row = (over: Partial<MovementFingerprint> = {}): MovementFingerprint => ({
  type: 'expense',
  amountCents: 4500050,
  occurredAt: new Date('2026-10-18T13:20:00Z'),
  description: null,
  ...over,
})

test('nothing recorded means nothing duplicated', () => {
  assert.deepEqual(duplicateFlags([row(), row({ amountCents: 100 })], []), [false, false])
})

test('same type, amount and day is a duplicate even at another time of day', () => {
  const existing = [row({ occurredAt: new Date('2026-10-18T01:00:00Z') })]
  assert.deepEqual(duplicateFlags([row()], existing), [true])
})

test('type, amount or day differing is not a duplicate', () => {
  const existing = [row()]
  assert.deepEqual(
    duplicateFlags(
      [
        row({ type: 'income' }),
        row({ amountCents: 4500051 }),
        row({ occurredAt: new Date('2026-10-19T13:20:00Z') }),
      ],
      existing,
    ),
    [false, false, false],
  )
})

test('a description only separates rows when both have one', () => {
  const existing = [row({ description: 'Exito' })]
  assert.deepEqual(duplicateFlags([row({ description: 'Exito' })], existing), [true])
  assert.deepEqual(duplicateFlags([row({ description: 'Carulla' })], existing), [false])
  assert.deepEqual(duplicateFlags([row({ description: null })], existing), [true])
  assert.deepEqual(duplicateFlags([row({ description: 'Exito' })], [row({ description: null })]), [true])
})

test('earlier rows of the same batch count', () => {
  // Two identical rows in one statement are one movement: only the first is created.
  assert.deepEqual(duplicateFlags([row(), row(), row({ amountCents: 1 })], []), [false, true, false])
  // Both rows match a movement already recorded, so both are skipped.
  assert.deepEqual(
    duplicateFlags([row({ description: 'Exito' }), row({ description: 'Exito' })], [row({ description: 'Exito' })]),
    [true, true],
  )
})
