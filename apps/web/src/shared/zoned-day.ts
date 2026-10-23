// Pure day math in an IANA timezone. No imports, so `node --test` runs it as-is.

/** The YYYY-MM-DD wall-clock day of `at` in that timezone. */
export const dayIn = (timeZone: string, at: Date) => at.toLocaleDateString('sv', { timeZone })

/**
 * The ISO instant of 12:00 wall-clock time on `day` in that timezone. Noon is never inside a DST
 * gap, so one correction against the zone's offset at the guess is exact.
 */
export function noonIn(timeZone: string, day: string): string {
  const guess = Date.parse(`${day}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(guess))
  const field = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const wall = Date.UTC(field('year'), field('month') - 1, field('day'), field('hour'), field('minute'), field('second'))
  return new Date(guess - (wall - guess)).toISOString()
}
