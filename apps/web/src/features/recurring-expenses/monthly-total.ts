/** The frequencies a monthly figure can be built from; `irregular` has no month to land on. */
export type TotalFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

/** How many times a frequency is charged in a month. A year is 52 weeks and 12 months, as banks count. */
const PER_MONTH: Record<TotalFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

export type MonthlyTotal = { currency: string; amount: number }

/**
 * What the rows cost per month, per currency: a weekly bill counts 52/12 times, a yearly one a
 * twelfth. An inactive row costs nothing; one off the calendar (`irregular`) cannot be a month.
 * Sums go through cents, so a month never drifts by a hundredth.
 */
export function monthlyTotal(
  rows: { amount: number; currency: string; frequency: string; active?: boolean }[],
): MonthlyTotal[] {
  const cents = new Map<string, number>()
  for (const row of rows) {
    if (row.active === false) continue
    const perMonth = PER_MONTH[row.frequency as TotalFrequency]
    if (!perMonth) continue
    cents.set(row.currency, (cents.get(row.currency) ?? 0) + Math.round(row.amount * 100 * perMonth))
  }
  return [...cents]
    .map(([currency, value]) => ({ currency, amount: value / 100 }))
    .sort((a, b) => b.amount - a.amount || a.currency.localeCompare(b.currency))
}
