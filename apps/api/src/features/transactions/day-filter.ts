import { and, gte, lt, type SQL } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { dayRangeIn } from '../../shared/day-range.ts'

/**
 * The window the user's days open over an instant: the start day included, the end day excluded.
 * The column is passed in, so the rule can be tested without the whole schema.
 */
export const dayFilter = (
  occurredAt: AnySQLiteColumn,
  timeZone: string,
  from?: string,
  to?: string,
): SQL | undefined => {
  const range = dayRangeIn(timeZone, from, to)
  return and(range.start ? gte(occurredAt, range.start) : undefined, range.end ? lt(occurredAt, range.end) : undefined)
}
