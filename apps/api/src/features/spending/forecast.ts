/** What a day brings: the money that arrives and the money that leaves. */
export type ForecastDay = { day: string; incomeCents: number; expenseCents: number }

export type ForecastPoint = { day: string; balanceCents: number }

/**
 * The balance at the end of each day, and the day it is lowest. The lowest point is the answer to
 * "will I run out of money before the month ends".
 */
export const projectBalances = (
  startCents: number,
  days: ForecastDay[],
): { points: ForecastPoint[]; lowest: ForecastPoint | null } => {
  let balance = startCents
  const points = days.map((day) => {
    balance += day.incomeCents - day.expenseCents
    return { day: day.day, balanceCents: balance }
  })
  const lowest = points.reduce<ForecastPoint | null>(
    (lowest, point) => (lowest === null || point.balanceCents < lowest.balanceCents ? point : lowest),
    null,
  )
  return { points, lowest }
}
