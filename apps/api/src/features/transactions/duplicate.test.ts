import assert from 'node:assert/strict'
import { test } from 'node:test'
import { duplicateFlags, type MovementFingerprint } from './duplicate.ts'

const BOGOTA = 'America/Bogota'

const row = (over: Partial<MovementFingerprint> = {}): MovementFingerprint => ({
  type: 'expense',
  amountCents: 4500050,
  occurredAt: new Date('2026-10-18T13:20:00Z'),
  title: null,
  description: null,
  ...over,
})

const flags = (batch: MovementFingerprint[], existing: MovementFingerprint[] = []) =>
  duplicateFlags(batch, existing, BOGOTA)

test('nothing recorded means nothing duplicated', () => {
  assert.deepEqual(
    flags([row(), row({ amountCents: 100 })]).map((verdict) => verdict.duplicate),
    [false, false],
  )
})

test('same type, amount, day and title is the same movement', () => {
  const existing = [row({ title: 'Exito' })]
  assert.deepEqual(flags([row({ title: 'Exito' })], existing).map((verdict) => verdict.duplicate), [true])
})

test('type, amount or day differing is not a duplicate', () => {
  const existing = [row({ title: 'Exito' })]
  assert.deepEqual(
    flags(
      [
        row({ type: 'income', title: 'Exito' }),
        row({ amountCents: 4500051, title: 'Exito' }),
        row({ occurredAt: new Date('2026-10-19T13:20:00Z'), title: 'Exito' }),
      ],
      existing,
    ).map((verdict) => verdict.duplicate),
    [false, false, false],
  )
})

test('a missing title never makes two movements the same one', () => {
  // Two real movements of the same amount and day that the statement does not name.
  const verdicts = flags([row(), row()])
  assert.deepEqual(
    verdicts.map((verdict) => verdict.duplicate),
    [false, false],
  )
  // The second one only looks like the first: it is imported, and shown as a possible duplicate.
  assert.deepEqual(
    verdicts.map((verdict) => verdict.possible),
    [false, true],
  )
})

test('a description that both carry and that matches is enough', () => {
  const existing = [row({ description: 'Pago en la sede de la calle 100' })]
  assert.deepEqual(
    flags([row({ description: 'Pago en la sede de la calle 100' })], existing).map((verdict) => verdict.duplicate),
    [true],
  )
  assert.deepEqual(
    flags([row({ description: 'Otro pago' })], existing).map((verdict) => verdict.duplicate),
    [false],
  )
})

test('two movements that both name themselves differently are not even possible duplicates', () => {
  const existing = [row({ title: 'Exito' })]
  const verdicts = flags([row({ title: 'Carulla' })], existing)
  assert.deepEqual(
    verdicts.map((verdict) => verdict.duplicate),
    [false],
  )
  assert.deepEqual(
    verdicts.map((verdict) => verdict.possible),
    [false],
  )
})

test('earlier rows of the same batch count', () => {
  // Two rows the statement names the same way are one movement: only the first is created.
  assert.deepEqual(
    flags([row({ title: 'Exito' }), row({ title: 'Exito' }), row({ title: 'Carulla' })]).map(
      (verdict) => verdict.duplicate,
    ),
    [false, true, false],
  )
  // Both rows match a movement already recorded, so both are skipped.
  assert.deepEqual(
    flags([row({ title: 'Exito' }), row({ title: 'Exito' })], [row({ title: 'Exito' })]).map(
      (verdict) => verdict.duplicate,
    ),
    [true, true],
  )
})

test('the day is the one of the user timezone, not the one of UTC', () => {
  // 2026-10-18T02:00Z is October 17 in Bogotá.
  const existing = [row({ occurredAt: new Date('2026-10-18T02:00:00Z'), title: 'Exito' })]
  // 2026-10-17T23:00Z is also October 17 in Bogotá, though another day in UTC.
  assert.deepEqual(
    flags([row({ occurredAt: new Date('2026-10-17T23:00:00Z'), title: 'Exito' })], existing).map(
      (verdict) => verdict.duplicate,
    ),
    [true],
  )
  // 2026-10-18T13:20Z is October 18 in Bogotá.
  assert.deepEqual(
    flags([row({ occurredAt: new Date('2026-10-18T13:20:00Z'), title: 'Exito' })], existing).map(
      (verdict) => verdict.duplicate,
    ),
    [false],
  )
})
