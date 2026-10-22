/**
 * The instants a calendar day starts and ends in a timezone.
 *
 * A day is the user's, not the server's: "2026-10-21" means the day that reads
 * October 21 on the user's wall clock. The server stores instants, so the day
 * has to be turned into an instant before it can be compared.
 */

/** The zone's wall clock date and its offset from UTC at that instant, in milliseconds. */
const wallAt = (timeZone: string, instant: Date) => {
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
  return { day: `${values.year}-${values.month}-${values.day}`, offset: wall - instant.getTime() }
}

/**
 * The instant the calendar day starts in that timezone, e.g.
 * startOfDayIn('America/Bogota', '2026-10-21') → 2026-10-21T05:00:00Z.
 *
 * Midnight UTC is only a guess at the day's offset: a day whose clock moves at
 * midnight starts under a different offset, so that guess can land on the day
 * before (a spring-forward skips local midnight), the day after (a fall-back
 * repeats it), or an hour into the day. The offset read at each guess moves the
 * proposal, and the day begins at the earliest proposal that reads its date.
 */
export const startOfDayIn = (timeZone: string, day: string) => {
  const guess = new Date(`${day}T00:00:00Z`)
  const first = new Date(guess.getTime() - wallAt(timeZone, guess).offset)
  const atFirst = wallAt(timeZone, first)
  const second = new Date(guess.getTime() - atFirst.offset)
  const atSecond = second.getTime() === first.getTime() ? atFirst : wallAt(timeZone, second)
  if (atFirst.day === day && atSecond.day === day) return second < first ? second : first
  if (atFirst.day === day) return first
  if (atSecond.day === day) return second
  // A day the clock skipped entirely has no first instant; its edge is the later guess.
  return second > first ? second : first
}

/**
 * The instants a range of calendar days covers: the start day included, the end
 * day excluded. A range without an end is open to the end of time.
 */
export const dayRangeIn = (timeZone: string, from?: string, to?: string) => ({
  start: from ? startOfDayIn(timeZone, from) : null,
  end: to ? startOfDayIn(timeZone, to) : null,
})
