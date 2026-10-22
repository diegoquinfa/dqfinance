/**
 * The last day of the month `day` falls in, and the days left until it, today included.
 * The dates are calendar dates (YYYY-MM-DD) in the user's timezone, so no timezone maths is needed.
 */
export const monthPeriod = (day: string): { end: string; daysLeft: number } => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    end: `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
    daysLeft: daysInMonth - date + 1,
  }
}
