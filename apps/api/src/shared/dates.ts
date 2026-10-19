import { z } from 'zod'

/** Calendar date, YYYY-MM-DD. */
export const isoDate = z.iso.date()

/** ISO 8601 datetime with offset; optional fields default to "now" in use cases. */
export const isoDateTime = z.iso.datetime({ offset: true })

/** Today's calendar date in an IANA timezone, e.g. todayIn('America/Bogota') → '2026-10-18'. */
export const todayIn = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

export const isTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}
