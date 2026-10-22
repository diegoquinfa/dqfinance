/**
 * The months left until the goal's date, counting the current one. A goal whose date has passed
 * still has one month: what is left of it is reserved at once.
 */
export const monthsLeft = (today: string, targetDate: string): number => {
  const [year, month] = today.split('-').map(Number) as [number, number]
  const [targetYear, targetMonth] = targetDate.split('-').map(Number) as [number, number]
  return Math.max(1, (targetYear - year) * 12 + (targetMonth - month) + 1)
}

/** How much of a goal is already saved, from 0 to 1. */
export const savedRatio = (targetCents: number, contributedCents: number): number => {
  if (targetCents <= 0) return 1
  return Math.min(1, contributedCents / targetCents)
}

/**
 * What a goal sets aside every month until it is reached: what is left of it, spread over the
 * months left. A goal without a date has no schedule, so it reserves nothing.
 */
export const monthlySetAside = (remainingCents: number, months: number): number =>
  months <= 0 ? 0 : Math.floor(remainingCents / months)

export type GoalProgress = {
  /** What the goal aims at. */
  targetCents: number
  /** What the user already put into it. */
  contributedCents: number
  /** What is left to save. */
  remainingCents: number
  /** How much of the goal is saved, from 0 to 1. */
  ratio: number
  /** The months left until the goal's date; null without a date. */
  monthsLeft: number | null
  /** What the goal sets aside every month; 0 without a date. */
  monthlyCents: number
}

/** What a goal holds today, and what it asks for every month. */
export const goalProgress = (
  goal: { targetCents: number; contributedCents: number; targetDate: string | null },
  today: string,
): GoalProgress => {
  const months = goal.targetDate ? monthsLeft(today, goal.targetDate) : null
  const remainingCents = Math.max(0, goal.targetCents - goal.contributedCents)
  return {
    targetCents: goal.targetCents,
    contributedCents: goal.contributedCents,
    remainingCents,
    ratio: savedRatio(goal.targetCents, goal.contributedCents),
    monthsLeft: months,
    monthlyCents: months === null ? 0 : monthlySetAside(remainingCents, months),
  }
}
