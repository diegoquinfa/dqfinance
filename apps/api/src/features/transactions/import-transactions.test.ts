import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayOf, dayWindow, duplicateFlags, instantOfDay, type MovementFingerprint } from './duplicate.ts'

const BOGOTA = 'America/Bogota'
const TOKYO = 'Asia/Tokyo'

const row = (over: Partial<MovementFingerprint> = {}): MovementFingerprint => ({
  type: 'expense',
  amountCents: 4500050,
  occurredAt: instantOfDay(BOGOTA, '2026-10-21'),
  title: null,
  description: null,
  ...over,
})

test('a movement dated the 21 lands on the 21 in the timezone of the user', () => {
  const bogota = instantOfDay(BOGOTA, '2026-10-21')
  assert.equal(dayOf(BOGOTA, bogota), '2026-10-21')
  const tokyo = instantOfDay(TOKYO, '2026-10-21')
  assert.equal(dayOf(TOKYO, tokyo), '2026-10-21')
  // The instant is not the UTC midnight, which in Bogotá is the day before.
  assert.notEqual(bogota.toISOString(), '2026-10-21T00:00:00.000Z')
})

test('the window the import reads covers the local days of the batch', () => {
  const window = dayWindow(BOGOTA, [instantOfDay(BOGOTA, '2026-10-21')])
  assert.equal(window.start.toISOString(), '2026-10-21T05:00:00.000Z')
  assert.equal(window.end.toISOString(), '2026-10-22T05:00:00.000Z')

  const two = dayWindow(BOGOTA, [instantOfDay(BOGOTA, '2026-10-20'), instantOfDay(BOGOTA, '2026-10-22')])
  assert.equal(two.start.toISOString(), '2026-10-20T05:00:00.000Z')
  assert.equal(two.end.toISOString(), '2026-10-23T05:00:00.000Z')
})

test('two movements of the same amount and day with different titles are both imported', () => {
  const verdicts = duplicateFlags(
    [row({ title: 'Exito' }), row({ title: 'Carulla' })],
    [],
    BOGOTA,
  )
  assert.deepEqual(
    verdicts.map((verdict) => verdict.duplicate),
    [false, false],
  )
})

test('two rows of the same batch without a title are not dropped in silence', () => {
  const verdicts = duplicateFlags([row(), row()], [], BOGOTA)
  assert.deepEqual(
    verdicts.map((verdict) => verdict.duplicate),
    [false, false],
  )
  // The second one only looks like the first: the preview shows it and the user decides.
  assert.deepEqual(
    verdicts.map((verdict) => verdict.possible),
    [false, true],
  )
})

test('importing the same statement twice creates nothing the second time', () => {
  const statement = [row({ title: 'Exito' }), row({ title: 'Carulla' })]
  const verdicts = duplicateFlags(statement, statement, BOGOTA)
  assert.deepEqual(
    verdicts.map((verdict) => verdict.duplicate),
    [true, true],
  )
})
