import { z } from 'zod'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { currencyCode, moneyAmount, toCents } from '../../shared/money'
import { assertCurrencyEnabled, requireSettings } from '../settings/get-settings'
import { isoDate } from '../../shared/dates'
import { goalView } from './goal-view'
import { savingsGoal } from './savings-goal.schema'

export const createGoalInput = z.object({
  name: z.string().trim().min(1).max(60),
  target: moneyAmount.describe('What the goal aims at (decimal, not cents)'),
  currency: currencyCode.optional().describe("Defaults to the user's primary currency"),
  targetDate: isoDate.optional().describe('When the user wants it reached by (YYYY-MM-DD)'),
})

export async function createGoal(db: Db, userId: string, input: z.infer<typeof createGoalInput>) {
  const settings = await requireSettings(db, userId)
  const currency = input.currency ?? settings.primaryCurrency
  await assertCurrencyEnabled(db, userId, currency)
  const [row] = await db
    .insert(savingsGoal)
    .values({
      userId,
      name: input.name,
      targetCents: toCents(input.target),
      currency,
      targetDate: input.targetDate ?? null,
    })
    .returning()
  return goalView(row!, 0, todayIn(settings.timezone))
}
