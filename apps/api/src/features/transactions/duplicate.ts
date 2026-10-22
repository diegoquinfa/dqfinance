import { todayIn } from '../../shared/dates.ts'
import { dayRangeIn, startOfDayIn } from '../../shared/day-range.ts'

/**
 * The rules of a statement import that need no database: the calendar day a movement
 * belongs to, in the user's timezone, and when two movements are the same one.
 */

/** What makes two movements the same one: type, amount, calendar day, and the text that names it. */
export type MovementFingerprint = {
  type: 'income' | 'expense'
  amountCents: number
  occurredAt: Date
  title: string | null
  description: string | null
}

/** The calendar day an instant belongs to, in the user's timezone. */
export const dayOf = (timeZone: string, at: Date) => todayIn(timeZone, at)

/** The instant a statement's calendar day is recorded at, so the day never shifts. */
export const instantOfDay = (timeZone: string, day: string) => startOfDayIn(timeZone, day)

/** The next calendar day; the shift is done in UTC, so no timezone can skip a day. */
const nextDay = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** The instants the calendar days of a batch cover, in the user's timezone. */
export const dayWindow = (timeZone: string, instants: Date[]) => {
  const days = instants.map((at) => dayOf(timeZone, at)).sort()
  const range = dayRangeIn(timeZone, days[0]!, nextDay(days.at(-1)!))
  return { start: range.start!, end: range.end! }
}

/** What two movements say about each other when they share type, amount and day. */
type Comparison = 'same' | 'different' | 'unknown'

/**
 * Two movements are the same one when a title or a description that both carry matches.
 * They are different ones when both name their movement and the names differ. What is
 * left is unknown: nothing says they are the same, and nothing says they are not.
 */
const compare = (a: MovementFingerprint, b: MovementFingerprint): Comparison => {
  const bothTitles = !!a.title && !!b.title
  const bothDescriptions = !!a.description && !!b.description
  if (bothTitles && a.title === b.title) return 'same'
  if (bothDescriptions && a.description === b.description) return 'same'
  if (bothTitles && a.title !== b.title) return 'different'
  if (bothDescriptions && a.description !== b.description) return 'different'
  return 'unknown'
}

/** What the import does with a row: skipped as already recorded, or only worth a look. */
export type DuplicateVerdict = { duplicate: boolean; possible: boolean }

/**
 * Flags the rows that are a movement already recorded on the same source, either in the
 * database or earlier in the same batch, and the rows that only look like one. Pure: no
 * D1, so the rule tests on its own.
 */
export function duplicateFlags(
  batch: MovementFingerprint[],
  existing: MovementFingerprint[],
  timeZone: string,
): DuplicateVerdict[] {
  const key = (m: MovementFingerprint) => `${m.type}|${m.amountCents}|${dayOf(timeZone, m.occurredAt)}`
  const byKey = new Map<string, MovementFingerprint[]>()
  const remember = (row: MovementFingerprint) => {
    const bucket = byKey.get(key(row))
    if (bucket) bucket.push(row)
    else byKey.set(key(row), [row])
  }
  existing.forEach(remember)

  return batch.map((row) => {
    const bucket = byKey.get(key(row)) ?? []
    const duplicate = bucket.some((other) => compare(other, row) === 'same')
    // Nothing says it is the same movement, so it is imported and only shown as a possible one.
    const possible = !duplicate && bucket.some((other) => compare(other, row) === 'unknown')
    // A row the import will skip does not become the reason a later identical row is skipped.
    if (!duplicate) remember(row)
    return { duplicate, possible }
  })
}
