/** What a day brings: the money that arrives and the money that leaves. */
export type ForecastDay = { day: string; incomeCents: number; expenseCents: number }

export type ForecastPoint = { day: string; balanceCents: number }

/**
 * What the user spends each day at their pace: this month's variable spending so far, divided by
 * the days elapsed (today included, so day 1 divides by 1). Rounded down, never negative.
 */
export const dailyPaceCents = (spentCents: number, daysElapsed: number): number =>
  Math.max(0, Math.floor(spentCents / daysElapsed))

/**
 * The balance at the end of each day, and the day it is lowest. The lowest point is the answer to
 * "will I run out of money before the month ends". With a pace, it is spent on every day after
 * `today`: today's spending is already in the balance.
 */
export const projectBalances = (
  startCents: number,
  days: ForecastDay[],
  pace?: { today: string; dailyCents: number },
): { points: ForecastPoint[]; lowest: ForecastPoint | null } => {
  let balance = startCents
  const points = days.map((day) => {
    const paceCents = pace && day.day > pace.today ? pace.dailyCents : 0
    balance += day.incomeCents - day.expenseCents - paceCents
    return { day: day.day, balanceCents: balance }
  })
  const lowest = points.reduce<ForecastPoint | null>(
    (lowest, point) => (lowest === null || point.balanceCents < lowest.balanceCents ? point : lowest),
    null,
  )
  return { points, lowest }
}
