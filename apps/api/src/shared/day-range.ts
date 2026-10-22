/**
 * The instants a calendar day starts and ends in a timezone.
 *
 * A day is the user's, not the server's: "2026-10-21" means the day that reads
 * October 21 on the user's wall clock. The server stores instants, so the day
 * has to be turned into an instant before it can be compared.
 */

/** The zone's offset from UTC at that instant, in milliseconds. */
const offsetAt = (timeZone: string, instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const part = (type: string) => Number(values[type])
  const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
  return wall - instant.getTime()
}

/**
 * The instant the calendar day starts in that timezone, e.g.
 * startOfDayIn('America/Bogota', '2026-10-21') → 2026-10-21T05:00:00Z.
 *
 * The offset is read twice because a day that changes its offset (the clock
 * moves) is not solved by the first guess.
 */
export const startOfDayIn = (timeZone: string, day: string) => {
  const guess = new Date(`${day}T00:00:00Z`)
  const offset = offsetAt(timeZone, guess)
  const candidate = new Date(guess.getTime() - offset)
  const settled = offsetAt(timeZone, candidate)
  return settled === offset ? candidate : new Date(guess.getTime() - settled)
}

/**
 * The instants a range of calendar days covers: the start day included, the end
 * day excluded. A range without an end is open to the end of time.
 */
export const dayRangeIn = (timeZone: string, from?: string, to?: string) => ({
  start: from ? startOfDayIn(timeZone, from) : null,
  end: to ? startOfDayIn(timeZone, to) : null,
})
