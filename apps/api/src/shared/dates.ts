import { z } from 'zod'

// Validated with zod's ISO checks, but published in JSON Schema as `format` only: zod also emits a
// ~300-char regex per field, which every MCP client loads in tools/list.
const strictDate = z.iso.date()
const strictDateTime = z.iso.datetime({ offset: true })

/** Calendar date, YYYY-MM-DD. */
export const isoDate = z
  .string()
  .refine((value) => strictDate.safeParse(value).success, { message: 'Invalid ISO date' })
  .meta({ format: 'date' })

/** ISO 8601 datetime with offset; optional fields default to "now" in use cases. */
export const isoDateTime = z
  .string()
  .refine((value) => strictDateTime.safeParse(value).success, { message: 'Invalid ISO datetime' })
  .meta({ format: 'date-time' })

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
