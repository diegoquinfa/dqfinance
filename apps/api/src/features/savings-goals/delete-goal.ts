import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { savingsContribution, savingsGoal } from './savings-goal.schema'

/** Deletes a goal and what was put into it. */
export async function deleteGoal(db: Db, userId: string, id: string) {
  found(
    await db
      .select({ id: savingsGoal.id })
      .from(savingsGoal)
      .where(and(eq(savingsGoal.id, id), eq(savingsGoal.userId, userId)))
      .get(),
    'savings_goal_not_found',
  )
  // One batch, so the contributions never outlive the goal.
  await db.batch([
    db
      .delete(savingsContribution)
      .where(and(eq(savingsContribution.goalId, id), eq(savingsContribution.userId, userId))),
    db.delete(savingsGoal).where(and(eq(savingsGoal.id, id), eq(savingsGoal.userId, userId))),
  ])
  return { id, deleted: true }
}
