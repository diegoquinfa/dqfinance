import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { currencyCode, fromCents, moneyAmount, toCents } from '../../shared/money'
import { category } from '../categories/category.schema'
import { assertCurrencyEnabled, requireSettings } from '../settings/get-settings'
import { budget } from './budget.schema'

export const setBudgetInput = z.object({
  categoryId: z.string().min(1).describe('The category the limit is for'),
  amount: moneyAmount.describe('What the category may spend in a month (decimal, not cents)'),
  currency: currencyCode.optional().describe("Defaults to the user's primary currency"),
})

/** Sets the limit of a category. One limit per category: the new amount replaces the old one. */
export async function setBudget(db: Db, userId: string, input: z.infer<typeof setBudgetInput>) {
  const settings = await requireSettings(db, userId)
  const currency = input.currency ?? settings.primaryCurrency
  await assertCurrencyEnabled(db, userId, currency)
  const owned = found(
    await db
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.id, input.categoryId), eq(category.userId, userId)))
      .get(),
    'category_not_found',
  )
  const amountCents = toCents(input.amount)
  const [row] = await db
    .insert(budget)
    .values({ userId, categoryId: owned.id, amountCents, currency })
    .onConflictDoUpdate({
      target: [budget.userId, budget.categoryId],
      set: { amountCents, currency },
    })
    .returning()
  return {
    id: row!.id,
    categoryId: row!.categoryId,
    currency: row!.currency,
    limit: fromCents(row!.amountCents),
  }
}
