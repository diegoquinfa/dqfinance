/**
 * The calendar of a credit card: the day its statement closes (the cut) and the day the statement
 * must be paid. Both are days of the month, clamped to the month's last day: a cut on the 31st
 * closes on the 30th in November and on the 28th or 29th in February.
 */

/** A month `months` away from YYYY-MM. */
const shiftMonth = (month: string, months: number): string => {
  const [year, index] = month.split('-').map(Number) as [number, number]
  const shifted = new Date(0)
  shifted.setUTCFullYear(year, index - 1 + months, 1)
  return shifted.toISOString().slice(0, 7)
}

/** The day `day` of a month (YYYY-MM), or its last day when the month is shorter. */
export const dayOfMonth = (month: string, day: number): string => {
  const [year, index] = month.split('-').map(Number) as [number, number]
  const last = new Date(0)
  last.setUTCFullYear(year, index, 0)
  return `${month}-${String(Math.min(day, last.getUTCDate())).padStart(2, '0')}`
}

/**
 * The last cut before today. A cut closes at the end of its day, so on the cut day itself the
 * statement is still open and the last cut is the previous month's.
 */
export const lastCutOn = (today: string, statementDay: number): string => {
  const thisMonth = dayOfMonth(today.slice(0, 7), statementDay)
  return thisMonth < today ? thisMonth : dayOfMonth(shiftMonth(today.slice(0, 7), -1), statementDay)
}

/** The first payment day after a cut: the same month when it comes later, else the next one. */
export const dueOnAfter = (cutOn: string, dueDay: number): string => {
  const sameMonth = dayOfMonth(cutOn.slice(0, 7), dueDay)
  return sameMonth > cutOn ? sameMonth : dayOfMonth(shiftMonth(cutOn.slice(0, 7), 1), dueDay)
}

/** What a statement still asks for: its payment, less what reached the card after the cut. */
export const remainingCents = (paymentCents: number, paidCents: number): number => Math.max(0, paymentCents - paidCents)
