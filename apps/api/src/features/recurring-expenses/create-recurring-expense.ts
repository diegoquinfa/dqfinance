import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, todayIn } from '../../shared/dates'
import { AppError, found } from '../../shared/http'
import { currencyCode, moneyAmount, toCents } from '../../shared/money'
import { resolveSource, sourceColumns, sourceRef } from '../accounts/source'
import { category } from '../categories/category.schema'
import { counterparty } from '../counterparties/counterparty.schema'
import { assertCurrencyEnabled, requireSettings } from '../settings/get-settings'
import { chargeCurrency } from '../transactions/create-transaction'
import { FREQUENCIES, recurringExpense } from './recurring-expense.schema'

export const createRecurringExpenseInput = z.object({
  name: z.string().trim().min(1).max(80),
  amount: moneyAmount.describe('Expected amount; it can be changed when confirming each occurrence'),
  source: sourceRef,
  currency: currencyCode.optional().describe('Credit cards only, as in create_transaction'),
  categoryId: z.string().min(1),
  counterpartyId: z.string().min(1).optional(),
  frequency: z.enum(FREQUENCIES),
  startsOn: isoDate.optional().describe("First due date, YYYY-MM-DD; defaults to today in the user's timezone"),
})

export async function createRecurringExpense(db: Db, userId: string, input: z.infer<typeof createRecurringExpenseInput>) {
  const [settings, source] = await Promise.all([requireSettings(db, userId), resolveSource(db, userId, input.source)])
  const currency = chargeCurrency(source, input.currency)
  if (currency !== source.currency) await assertCurrencyEnabled(db, userId, currency)

  const categoryRow = found(
    await db
      .select({ kind: category.kind })
      .from(category)
      .where(and(eq(category.id, input.categoryId), eq(category.userId, userId)))
      .get(),
    'category_not_found',
  )
  if (categoryRow.kind !== 'expense') throw new AppError('category_kind_mismatch')
  if (input.counterpartyId) {
    found(
      await db
        .select({ id: counterparty.id })
        .from(counterparty)
        .where(and(eq(counterparty.id, input.counterpartyId), eq(counterparty.userId, userId)))
        .get(),
      'counterparty_not_found',
    )
  }

  const startsOn = input.startsOn ?? todayIn(settings.timezone)
  const [row] = await db
    .insert(recurringExpense)
    .values({
      userId,
      name: input.name,
      amountCents: toCents(input.amount),
      currency,
      ...sourceColumns(source.ref),
      categoryId: input.categoryId,
      counterpartyId: input.counterpartyId,
      frequency: input.frequency,
      startsOn,
      nextDueOn: startsOn,
    })
    .returning()
  return { id: row!.id, nextDueOn: row!.nextDueOn }
}
