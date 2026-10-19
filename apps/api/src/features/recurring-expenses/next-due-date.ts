export type Frequency = 'weekly' | 'monthly' | 'yearly'

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
const format = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * The due date after `current` (calendar dates, YYYY-MM-DD).
 * Monthly and yearly keep the day of `startsOn`, clamped to the month's last day,
 * so Jan 31 → Feb 28 → Mar 31 instead of drifting to the 28th.
 */
export function nextDueDate(startsOn: string, current: string, frequency: Frequency): string {
  const [year, month, day] = current.split('-').map(Number) as [number, number, number]
  if (frequency === 'weekly') {
    const next = new Date(Date.UTC(year, month - 1, day + 7))
    return format(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate())
  }
  const anchorDay = Number(startsOn.slice(8, 10))
  const step = frequency === 'monthly' ? 1 : 12
  const target = new Date(Date.UTC(year, month - 1 + step, 1))
  const targetYear = target.getUTCFullYear()
  const targetMonth = target.getUTCMonth()
  return format(targetYear, targetMonth, Math.min(anchorDay, daysInMonth(targetYear, targetMonth)))
}
