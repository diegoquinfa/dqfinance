// Pure date math for the calendar grid. No imports, so `node --test` runs it as-is.

const pad = (n: number) => String(n).padStart(2, '0')
const day = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** A calendar date `days` away, YYYY-MM-DD. */
export const shiftDay = (value: string, days: number) => {
  const [year, month, date] = value.split('-').map(Number) as [number, number, number]
  return day(new Date(year, month - 1, date + days))
}

/**
 * The month `offset` months away from `now` as a Monday-first grid: `null` pads the first and
 * last week. `from` is its first day and `to` the first day of the next month (exclusive).
 */
export function monthGrid(offset: number, now = new Date()) {
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: (first.getDay() + 6) % 7 }, () => null)
  for (let date = 1; date <= daysInMonth; date++) cells.push(day(new Date(first.getFullYear(), first.getMonth(), date)))
  while (cells.length % 7) cells.push(null)
  return { from: day(first), to: day(new Date(first.getFullYear(), first.getMonth() + 1, 1)), cells }
}

type Day = { currency: string; spent: number; received: number }
type Due = { currency: string; amount: number }

/** Spent, received and still due in one currency, summed in cents so decimals never drift. */
export function monthTotals(days: Day[], due: Due[], currency: string) {
  const cents = (amount: number) => Math.round(amount * 100)
  let spent = 0
  let received = 0
  let dueCents = 0
  for (const entry of days) {
    if (entry.currency !== currency) continue
    spent += cents(entry.spent)
    received += cents(entry.received)
  }
  for (const item of due) if (item.currency === currency) dueCents += cents(item.amount)
  return { spent: spent / 100, received: received / 100, due: dueCents / 100 }
}
