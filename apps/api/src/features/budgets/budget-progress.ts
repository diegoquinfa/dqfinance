export type BudgetProgress = {
  /** What the category may spend in a month. */
  limitCents: number
  /** What was already spent in it this month. */
  spentCents: number
  /** What is left of the limit; negative when the limit is gone. */
  leftCents: number
  /** How much of the limit is used. It can go past one. */
  ratio: number
  /** True when the limit is close: a fifth of it or less is left. */
  close: boolean
}

/** What a budget has left, and how close it is to its limit. */
export const budgetProgress = (limitCents: number, spentCents: number): BudgetProgress => {
  const leftCents = limitCents - spentCents
  const ratio = limitCents <= 0 ? 0 : spentCents / limitCents
  return {
    limitCents,
    spentCents,
    leftCents,
    ratio,
    close: limitCents > 0 && leftCents <= limitCents / 5,
  }
}
