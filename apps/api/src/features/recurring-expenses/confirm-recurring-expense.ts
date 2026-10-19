import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { found } from '../../shared/http'
import { fromCents, moneyAmount } from '../../shared/money'
import { sourceRefOf } from '../accounts/source'
import { createTransaction } from '../transactions/create-transaction'
import { nextDueDate } from './next-due-date'
import { recurringExpense } from './recurring-expense.schema'

export const confirmRecurringExpenseInput = z.object({
  id: z.string().min(1),
  amount: moneyAmount.optional().describe('The real amount this time; defaults to the expected amount'),
  primaryAmount: moneyAmount.optional().describe('Credit card charge in a foreign currency: value in the card currency'),
  occurredAt: isoDateTime.optional().describe('Defaults to now'),
})

export const skipRecurringExpenseInput = z.object({ id: z.string().min(1) })

async function loadOwned(db: Db, userId: string, id: string) {
  return found(
    await db
      .select()
      .from(recurringExpense)
      .where(and(eq(recurringExpense.id, id), eq(recurringExpense.userId, userId)))
      .get(),
    'recurring_not_found',
  )
}

/** Advances the due date only if nobody else did it first (guards a double click). */
async function advance(db: Db, item: typeof recurringExpense.$inferSelect) {
  const next = nextDueDate(item.startsOn, item.nextDueOn, item.frequency)
  await db
    .update(recurringExpense)
    .set({ nextDueOn: next })
    .where(and(eq(recurringExpense.id, item.id), eq(recurringExpense.nextDueOn, item.nextDueOn)))
  return next
}

/** Records this occurrence as a real expense and moves to the next due date (design D11). */
export async function confirmRecurringExpense(db: Db, userId: string, input: z.infer<typeof confirmRecurringExpenseInput>) {
  const item = await loadOwned(db, userId, input.id)
  // shortcut: the transaction and the date advance are two statements; a failure between them leaves the
  // item pending again (visible, not lost). Batch them if createTransaction ever exposes its insert.
  const created = await createTransaction(
    db,
    userId,
    {
      type: 'expense',
      amount: input.amount ?? fromCents(item.amountCents),
      source: sourceRefOf(item),
      currency: item.currency,
      primaryAmount: input.primaryAmount,
      categoryId: item.categoryId,
      counterpartyId: item.counterpartyId ?? undefined,
      description: item.name,
      occurredAt: input.occurredAt,
    },
    { recurringExpenseId: item.id },
  )
  return { transaction: created, nextDueOn: await advance(db, item) }
}

export async function skipRecurringExpense(db: Db, userId: string, input: z.infer<typeof skipRecurringExpenseInput>) {
  return { nextDueOn: await advance(db, await loadOwned(db, userId, input.id)) }
}

export async function deleteRecurringExpense(db: Db, userId: string, id: string) {
  await loadOwned(db, userId, id)
  await db.delete(recurringExpense).where(eq(recurringExpense.id, id))
  return { id }
}
