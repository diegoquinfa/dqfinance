import { fromCents } from '../../shared/money'
import { goalProgress } from './goal-progress'

/** What a goal looks like to the web and to an agent. */
export type GoalView = {
  id: string
  name: string
  currency: string
  /** When the user wants it reached by; null when there is no date. */
  targetDate: string | null
  target: number
  contributed: number
  remaining: number
  /** How much of the goal is saved, from 0 to 1. */
  ratio: number
  /** The months left until the goal's date; null without a date. */
  monthsLeft: number | null
  /** What the goal sets aside every month. */
  monthly: number
  /** Whether what the user put in has reached the target. */
  reached: boolean
  /** Whether the web has already celebrated the goal being reached. */
  celebrated: boolean
}

/** The goal with what it holds today and what it asks for every month. */
export const goalView = (
  goal: {
    id: string
    name: string
    currency: string
    targetDate: string | null
    targetCents: number
    celebratedAt: Date | null
  },
  contributedCents: number,
  today: string,
): GoalView => {
  const progress = goalProgress(
    { targetCents: goal.targetCents, contributedCents, targetDate: goal.targetDate },
    today,
  )
  return {
    id: goal.id,
    name: goal.name,
    currency: goal.currency,
    targetDate: goal.targetDate,
    target: fromCents(goal.targetCents),
    contributed: fromCents(contributedCents),
    remaining: fromCents(progress.remainingCents),
    ratio: progress.ratio,
    monthsLeft: progress.monthsLeft,
    monthly: fromCents(progress.monthlyCents),
    reached: contributedCents >= goal.targetCents,
    celebrated: goal.celebratedAt !== null,
  }
}
