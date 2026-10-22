/** The days between two calendar dates, today included. */
const daysUntil = (today: string, end: string): number => {
  const [year, month, date] = today.split('-').map(Number) as [number, number, number]
  const [endYear, endMonth, endDate] = end.split('-').map(Number) as [number, number, number]
  const from = new Date(0)
  from.setUTCFullYear(year, month - 1, date)
  const to = new Date(0)
  to.setUTCFullYear(endYear, endMonth - 1, endDate)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
}

export type ExpectedIncome = { amountCents: number; nextOn: string }

/**
 * The period the daily number covers. It ends at the next payday when there is one before the end
 * of the month, because that money arrives during the period: the number then counts the days
 * until the salary, not the days left in the month.
 */
export const incomePeriod = (
  today: string,
  monthEnd: string,
  incomes: ExpectedIncome[],
): { end: string; daysLeft: number; expectedCents: number } => {
  const upcoming = incomes
    .filter((income) => income.nextOn >= today)
    .sort((a, b) => a.nextOn.localeCompare(b.nextOn))
  const first = upcoming[0]
  if (!first || first.nextOn > monthEnd) {
    return { end: monthEnd, daysLeft: daysUntil(today, monthEnd), expectedCents: 0 }
  }
  // Everything that lands on or before the payday is part of the period.
  const due = incomes.filter((income) => income.nextOn >= today && income.nextOn <= first.nextOn)
  return {
    end: first.nextOn,
    daysLeft: daysUntil(today, first.nextOn),
    expectedCents: due.reduce((sum, income) => sum + income.amountCents, 0),
  }
}
