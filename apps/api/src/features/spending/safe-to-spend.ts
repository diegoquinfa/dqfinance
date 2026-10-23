import { nextDueDate, type Frequency } from '../recurring-expenses/next-due-date.ts'
import { monthOf, monthsBetween, shareInMonth } from '../transactions/installments.ts'

/**
 * How much the user may spend today.
 *
 * today = (money in hand − fixed bills still due − savings and set-asides) / days left
 *
 * "Days left" runs to the end of the month, or to the next expected income, so the number corrects
 * itself: overspend one day and tomorrow's figure drops; underspend and it rises.
 */
export type SafeToSpendInput = {
  /** Money in hand, in the primary currency. */
  availableCents: number
  /** The fixed bills still due before the period ends. */
  pendingBillsCents: number
  /** What the user set aside: savings goals and yearly bills. */
  setAsidesCents: number
  /** What the user already spent this period. */
  spentCents: number
  /** The cap the user set for the month; null when they set none. */
  targetCents: number | null
  /** Days until the period ends, today included. */
  daysLeft: number
}

export type SafeToSpend = {
  /** The money free to spend once the bills and the set-asides are out of the way. */
  freeCents: number
  daysLeft: number
  /** What the money allows, per day. */
  dailyCents: number
  /** What the cap allows, per day; null without a cap. */
  targetDailyCents: number | null
  /** The lower of the two: what the user may actually spend today. */
  allowedCents: number
  /** True when the cap is what holds the number down. */
  cappedByTarget: boolean
}

/**
 * The number the user checks most: how much may I spend today. It never promises more than there
 * is, so the daily figure is rounded down to the cent.
 */
export const safeToSpend = (input: SafeToSpendInput): SafeToSpend => {
  const freeCents = input.availableCents - input.pendingBillsCents - input.setAsidesCents
  // The last day of the period still counts as one day.
  const daysLeft = Math.max(1, input.daysLeft)
  const dailyCents = Math.floor(freeCents / daysLeft)
  const targetDailyCents =
    input.targetCents === null ? null : Math.floor((input.targetCents - input.spentCents) / daysLeft)
  const allowedCents = targetDailyCents === null ? dailyCents : Math.min(dailyCents, targetDailyCents)
  return {
    freeCents,
    daysLeft,
    dailyCents,
    targetDailyCents,
    allowedCents,
    cappedByTarget: targetDailyCents !== null && targetDailyCents < dailyCents,
  }
}

export type Bill = {
  amountCents: number
  startsOn: string
  nextDueOn: string
  frequency: Frequency
}

/**
 * What the bills still take before the period ends: every occurrence from today on, and an overdue
 * bill once, because its date still waits to be confirmed.
 */
export const billsDueCents = (bills: Bill[], today: string, end: string): number => {
  let cents = 0
  for (const bill of bills) {
    // An overdue bill is still owed; count it once, not once per missed cycle.
    if (bill.nextDueOn < today) cents += bill.amountCents
    // A weekly bill falls more than once before the period ends; each occurrence from today counts.
    for (let day = bill.nextDueOn; day <= end; ) {
      if (day >= today) cents += bill.amountCents
      const next = nextDueDate(bill.startsOn, day, bill.frequency)
      // A due date that does not move on would add the bill for ever.
      if (next <= day) break
      day = next
    }
  }
  return cents
}

/**
 * What the yearly bills should already have put aside by the end of this month. A bill's cycle
 * starts twelve months before it falls due, so each month adds a twelfth: due next month, eleven
 * twelfths are held; due in eleven months, one. A bill due before the period ends is already a
 * pending bill in full, so it is not counted here.
 */
export const yearlySetAsideCents = (
  bills: Pick<Bill, 'amountCents' | 'nextDueOn'>[],
  end: string,
  currentMonth: string,
): number =>
  bills.reduce((sum, bill) => {
    if (bill.nextDueOn <= end) return sum
    // The clamp keeps at least one twelfth, and never more than the whole bill.
    const twelfths = Math.min(12, Math.max(1, 12 - monthsBetween(currentMonth, bill.nextDueOn.slice(0, 7))))
    return sum + Math.floor((bill.amountCents * twelfths) / 12)
  }, 0)

/**
 * What a savings goal holds back: what is already saved, plus this month's share of what is left.
 * Never more than the target.
 */
export const goalReservationCents = (targetCents: number, contributedCents: number, monthlyCents: number): number =>
  Math.min(targetCents, contributedCents + monthlyCents)

export type MonthExpense = { amountCents: number; months: number | null; occurredAt: Date }

/** What the expenses cost in a calendar month, each spread one only the share that month carries. */
export const monthSpentCents = (expenses: MonthExpense[], timeZone: string, month: string): number =>
  expenses.reduce(
    (sum, item) =>
      sum + shareInMonth(item.amountCents, item.months, monthsBetween(monthOf(item.occurredAt, timeZone), month)),
    0,
  )
