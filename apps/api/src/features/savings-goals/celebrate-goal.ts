import { and, eq, isNull, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { savingsContribution, savingsGoal } from './savings-goal.schema'

/**
 * Marks a reached goal as celebrated, once. The reached rule is part of the same UPDATE, so the
 * client's word never decides it; a goal not reached yet stays uncelebrated.
 */
export async function celebrateGoal(db: Db, userId: string, id: string) {
  await db
    .update(savingsGoal)
    .set({ celebratedAt: new Date() })
    .where(
      and(
        eq(savingsGoal.id, id),
        eq(savingsGoal.userId, userId),
        isNull(savingsGoal.celebratedAt),
        sql`${savingsGoal.targetCents} <= (select coalesce(sum(${savingsContribution.amountCents}), 0) from ${savingsContribution} where ${savingsContribution.goalId} = ${savingsGoal.id} and ${savingsContribution.userId} = ${userId})`,
      ),
    )
  const goal = found(
    await db
      .select({ celebratedAt: savingsGoal.celebratedAt })
      .from(savingsGoal)
      .where(and(eq(savingsGoal.id, id), eq(savingsGoal.userId, userId)))
      .get(),
    'savings_goal_not_found',
  )
  // Reports the state: false for a goal not reached yet, so the client never believes it was celebrated.
  return { id, celebrated: goal.celebratedAt !== null }
}
