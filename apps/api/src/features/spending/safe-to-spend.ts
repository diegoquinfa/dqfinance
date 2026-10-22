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
