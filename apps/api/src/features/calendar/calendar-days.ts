import { todayIn } from '../../shared/dates.ts'
import { fromCents } from '../../shared/money.ts'
import { nextDueDate, type Frequency } from '../recurring-expenses/next-due-date.ts'

/** A calendar date `days` away, YYYY-MM-DD. */
export const shiftDay = (day: string, days: number) => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  // Date.UTC maps the years 0-99 onto 1900-1999, so the year is set after the date is built.
  const shifted = new Date(0)
  shifted.setUTCFullYear(year, month - 1, date + days)
  return shifted.toISOString().slice(0, 10)
}

export type CalendarMovementRow = {
  type: 'income' | 'expense'
  currency: string
  cents: number
  occurredAt: Date
}

/** What one currency moved on one day of the user's calendar. */
export type CalendarDay = { day: string; currency: string; spent: number; received: number }

/**
 * Sums movements per day of the user's timezone and per currency, keeping only `from` (inclusive)
 * to `to` (exclusive). Money never mixes currencies, so a day has one entry per currency.
 */
export function groupByDay(rows: CalendarMovementRow[], timeZone: string, from: string, to: string): CalendarDay[] {
  const byKey = new Map<string, { day: string; currency: string; spentCents: number; receivedCents: number }>()
  for (const row of rows) {
    const day = todayIn(timeZone, row.occurredAt)
    if (day < from || day >= to) continue
    const key = `${day}|${row.currency}`
    let entry = byKey.get(key)
    if (!entry) {
      entry = { day, currency: row.currency, spentCents: 0, receivedCents: 0 }
      byKey.set(key, entry)
    }
    if (row.type === 'expense') entry.spentCents += row.cents
    else entry.receivedCents += row.cents
  }
  return [...byKey.values()]
    .sort((a, b) => a.day.localeCompare(b.day) || a.currency.localeCompare(b.currency))
    .map((entry) => ({
      day: entry.day,
      currency: entry.currency,
      spent: fromCents(entry.spentCents),
      received: fromCents(entry.receivedCents),
    }))
}

/**
 * The due dates of a recurring expense from `from` (inclusive) to `to` (exclusive), starting at
 * its next due date. An overdue one is still owed: in a range that holds today it shows once, today,
 * however many cycles were missed (as the forecast counts it); in a range before today it keeps its
 * dates.
 */
export function projectDueDates(
  item: { startsOn: string; nextDueOn: string; frequency: Frequency },
  from: string,
  to: string,
  today: string,
): string[] {
  const days: string[] = []
  // Overdue, seen from a range that holds today: one entry today stands for every missed cycle, so
  // none repeats, as safe to spend and the forecast count it.
  const owedToday = item.nextDueOn < today && from <= today && today < to
  if (owedToday) days.push(today)
  for (let day = item.nextDueOn; day < to; day = nextDueDate(item.startsOn, day, item.frequency)) {
    if (day >= from && !(owedToday && day < today)) days.push(day)
  }
  return days
}
