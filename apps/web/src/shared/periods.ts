// Pure date math for the period views. No imports, so `node --test` runs it as-is.

export type Period = 'week' | 'month' | 'year'

const day = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/**
 * The calendar week (Monday first), month or year `offset` periods away from `now` (0 = current,
 * -1 = previous), as `from` inclusive and `to` exclusive YYYY-MM-DD, which is what the API takes.
 */
export function periodRange(period: Period, offset: number, now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  if (period === 'year') return { from: day(new Date(y + offset, 0, 1)), to: day(new Date(y + offset + 1, 0, 1)) }
  if (period === 'month') return { from: day(new Date(y, m + offset, 1)), to: day(new Date(y, m + offset + 1, 1)) }
  const monday = now.getDate() - ((now.getDay() + 6) % 7) + offset * 7
  return { from: day(new Date(y, m, monday)), to: day(new Date(y, m, monday + 7)) }
}

/** The day after a YYYY-MM-DD day; UTC math, so no DST gap. The API's `to` is exclusive. */
export const dayAfter = (value: string) => new Date(Date.parse(`${value}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** From the first day of the month `months - 1` months ago; `to` is open (up to now). */
export const lastMonths = (months: number, now = new Date()) => ({
  from: day(new Date(now.getFullYear(), now.getMonth() - months + 1, 1)),
})
