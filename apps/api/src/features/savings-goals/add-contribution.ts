import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, todayIn } from '../../shared/dates'
import { AppError, found } from '../../shared/http'
import { fromCents, moneyAmount, toCents } from '../../shared/money'
import { requireSettings } from '../settings/get-settings'
import { savingsContribution, savingsGoal } from './savings-goal.schema'

export const addContributionInput = z.object({
  goalId: z.string().min(1),
  amount: moneyAmount.describe('What the user put into the goal (decimal, not cents)'),
  contributedOn: isoDate.optional().describe('The day it was made (YYYY-MM-DD); defaults to today'),
})

/** What the user put into a goal. The goal keeps what it had. */
export async function addContribution(db: Db, userId: string, input: z.infer<typeof addContributionInput>) {
  const settings = await requireSettings(db, userId)
  const goal = found(
    await db
      .select()
      .from(savingsGoal)
      .where(and(eq(savingsGoal.id, input.goalId), eq(savingsGoal.userId, userId)))
      .get(),
    'savings_goal_not_found',
  )
  if (!goal.active) throw new AppError('savings_goal_not_found')
  const [row] = await db
    .insert(savingsContribution)
    .values({
      userId,
      goalId: goal.id,
      amountCents: toCents(input.amount),
      contributedOn: input.contributedOn ?? todayIn(settings.timezone),
    })
    .returning()
  return {
    id: row!.id,
    goalId: goal.id,
    amount: fromCents(row!.amountCents),
    contributedOn: row!.contributedOn,
  }
}
