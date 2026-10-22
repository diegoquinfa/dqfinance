import type { IncomeFrequency } from './income-frequency'

/** A calendar date `days` away, YYYY-MM-DD. */
const addDays = (day: string, days: number) => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  // Date.UTC maps the years 0-99 onto 1900-1999, so the year is set after the date is built.
  const shifted = new Date(0)
  shifted.setUTCFullYear(year, month - 1, date + days)
  return shifted.toISOString().slice(0, 10)
}

/** A calendar date `months` away, clamped to the last day of the month it lands in. */
const addMonths = (day: string, months: number) => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  const shifted = new Date(0)
  shifted.setUTCFullYear(year, month - 1 + months, 1)
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate()
  shifted.setUTCDate(Math.min(date, lastDay))
  return shifted.toISOString().slice(0, 10)
}

/**
 * When the income arrives next: the first occurrence of its frequency on or after `today`. An
 * irregular one arrives when the user says it does.
 */
export const nextIncomeDate = (frequency: IncomeFrequency, anchor: string, today: string): string => {
  if (frequency === 'irregular') return anchor < today ? today : anchor
  const step = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 0
  if (step > 0) {
    let day = anchor
    while (day < today) day = addDays(day, step)
    return day
  }
  // The day of the month is re-derived from the anchor every time, so a bill on the 31st does not
  // drift to the 28th after passing through February.
  let months = 0
  while (addMonths(anchor, months) < today) months++
  return addMonths(anchor, months)
}
