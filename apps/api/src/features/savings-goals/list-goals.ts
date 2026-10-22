import { and, asc, eq, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { requireSettings } from '../settings/get-settings'
import { goalView, type GoalView } from './goal-view'
import { savingsContribution, savingsGoal } from './savings-goal.schema'

/** The goals of the user, with what each one holds today. */
export async function listGoals(db: Db, userId: string): Promise<GoalView[]> {
  const settings = await requireSettings(db, userId)
  const today = todayIn(settings.timezone)
  const goals = await db
    .select()
    .from(savingsGoal)
    .where(and(eq(savingsGoal.userId, userId), eq(savingsGoal.active, true)))
    .orderBy(asc(savingsGoal.createdAt))
  const contributions = await db
    .select({ goalId: savingsContribution.goalId, cents: sql<number>`sum(${savingsContribution.amountCents})` })
    .from(savingsContribution)
    .where(eq(savingsContribution.userId, userId))
    .groupBy(savingsContribution.goalId)
  const totals = new Map(contributions.map((row) => [row.goalId, Number(row.cents ?? 0)]))
  return goals.map((goal) => goalView(goal, totals.get(goal.id) ?? 0, today))
}
