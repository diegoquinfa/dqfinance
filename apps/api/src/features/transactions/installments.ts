/**
 * An expense the user spreads over several months for budgeting. The movement keeps its date and
 * its amount; only the budget and the safe-to-spend number see it in parts.
 */

import { todayIn } from '../../shared/dates.ts'

/** The months between two calendar months, the second one minus the first. */
export const monthsBetween = (from: string, to: string): number => {
  const [year, month] = from.split('-').map(Number) as [number, number]
  const [toYear, toMonth] = to.split('-').map(Number) as [number, number]
  return (toYear - year) * 12 + (toMonth - month)
}

/** The calendar month of a moment on the user's clock, YYYY-MM. */
export const monthOf = (at: Date, timeZone: string): string => todayIn(timeZone, at).slice(0, 7)

/**
 * The share of an expense that belongs to each month, starting with the month it happened. The
 * cents that do not divide stay with the first month, so the shares add up to the whole amount.
 */
export const installmentShares = (amountCents: number, months: number): number[] => {
  if (months <= 1) return [amountCents]
  const share = Math.floor(amountCents / months)
  const remainder = amountCents - share * months
  return Array.from({ length: months }, (_, index) => share + (index === 0 ? remainder : 0))
}

/**
 * What the expense still owes to the months after the current one: the money that already left
 * the account but belongs to a month that has not come yet. The share of the current month is
 * already spent, so it does not count.
 */
export const futureShares = (amountCents: number, months: number, elapsedMonths: number): number =>
  installmentShares(amountCents, months)
    .slice(Math.max(0, elapsedMonths + 1))
    .reduce((sum, share) => sum + share, 0)

/**
 * What an expense costs in a calendar month. A spread one costs that month's share, the same share
 * the safe-to-spend number puts back into the money; an ordinary one costs everything in the month
 * it happened.
 */
export const shareInMonth = (amountCents: number, months: number | null, elapsedMonths: number): number => {
  if (months === null) return elapsedMonths === 0 ? amountCents : 0
  return installmentShares(amountCents, months)[elapsedMonths] ?? 0
}
