import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { AppError, found } from '../../shared/http'
import { fromCents, moneyAmount } from '../../shared/money'
import { sourceRefOf } from '../accounts/source'
import { toTransactionView, transactionValues } from '../transactions/create-transaction'
import { transaction } from '../transactions/transaction.schema'
import { nextDueDate } from './next-due-date'
import { recurringExpense } from './recurring-expense.schema'

export const confirmRecurringExpenseInput = z.object({
  id: z.string().min(1),
  amount: moneyAmount.optional().describe('Real amount (decimal, not cents); defaults to the expected amount'),
  primaryAmount: moneyAmount.optional().describe('Card charge in a foreign currency: value in the card currency'),
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
async function advance(db: Db, userId: string, item: typeof recurringExpense.$inferSelect) {
  const next = nextDueDate(item.startsOn, item.nextDueOn, item.frequency)
  const advanced = await db
    .update(recurringExpense)
    .set({ nextDueOn: next })
    .where(
      and(
        eq(recurringExpense.id, item.id),
        eq(recurringExpense.userId, userId),
        eq(recurringExpense.nextDueOn, item.nextDueOn),
      ),
    )
    .returning({ nextDueOn: recurringExpense.nextDueOn })
  // Somebody else moved it already: this confirmation (or skip) is not the one that counts.
  if (advanced.length === 0) throw new AppError('recurring_already_confirmed', 409)
  return next
}

/** Records this occurrence as a real expense and moves to the next due date (design D11). */
export async function confirmRecurringExpense(db: Db, userId: string, input: z.infer<typeof confirmRecurringExpenseInput>) {
  const item = await loadOwned(db, userId, input.id)
  const values = await transactionValues(db, userId, {
    type: 'expense',
    amount: input.amount ?? fromCents(item.amountCents),
    source: sourceRefOf(item),
    currency: item.currency,
    primaryAmount: input.primaryAmount,
    categoryId: item.categoryId,
    counterpartyId: item.counterpartyId ?? undefined,
    title: item.name,
    occurredAt: input.occurredAt,
  })
  // The date moves first, so a second click finds it already moved and stops. If the movement then
  // fails, the date goes back where it was: the bill waits to be confirmed again.
  const next = await advance(db, userId, item)
  try {
    const [row] = await db
      .insert(transaction)
      .values({ userId, ...values, recurringExpenseId: item.id })
      .returning()
    return { transaction: toTransactionView(row!), nextDueOn: next }
  } catch (error) {
    await db
      .update(recurringExpense)
      .set({ nextDueOn: item.nextDueOn })
      .where(and(eq(recurringExpense.id, item.id), eq(recurringExpense.nextDueOn, next)))
    throw error
  }
}

export async function skipRecurringExpense(db: Db, userId: string, input: z.infer<typeof skipRecurringExpenseInput>) {
  return { nextDueOn: await advance(db, userId, await loadOwned(db, userId, input.id)) }
}

export async function deleteRecurringExpense(db: Db, userId: string, id: string) {
  await loadOwned(db, userId, id)
  await db.delete(recurringExpense).where(eq(recurringExpense.id, id))
  return { id }
}
