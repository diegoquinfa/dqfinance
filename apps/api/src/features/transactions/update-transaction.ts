import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { fromCents } from '../../shared/money'
import { sourceRefOf } from '../accounts/source'
import { createTransactionInput, DESCRIPTION_MAX, TITLE_MAX, toTransactionView, transactionValues } from './create-transaction'
import { mergeTransactionUpdate } from './merge-transaction-update'
import { transaction } from './transaction.schema'

export const updateTransactionInput = createTransactionInput.partial().extend({
  counterpartyId: z.string().min(1).nullable().optional().describe('From list_contacts; null removes it'),
  title: z.string().trim().max(TITLE_MAX).nullable().optional().describe('null removes the title'),
  description: z.string().trim().max(DESCRIPTION_MAX).nullable().optional().describe('null removes the description'),
})

/** The MCP tool has no path to take the id from, so it carries it in the input. */
export const updateTransactionToolInput = updateTransactionInput.extend({ id: z.string().min(1) })

/**
 * A movement of this user that can change on its own. The fee and FX entries of a transfer belong
 * to it, so they cannot. A movement of another user is not found.
 */
export async function editableTransaction(db: Db, userId: string, id: string) {
  const row = found(
    await db
      .select()
      .from(transaction)
      .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
      .get(),
    'transaction_not_found',
  )
  if (row.transferId) throw new AppError('transaction_from_transfer', 409)
  return row
}

/** Changes a movement. Balances are computed (design D1), so they follow on the next read. */
export async function updateTransaction(db: Db, userId: string, id: string, input: z.infer<typeof updateTransactionInput>) {
  const existing = await editableTransaction(db, userId, id)
  const merged = mergeTransactionUpdate(
    {
      type: existing.type,
      amount: fromCents(existing.amountCents),
      source: sourceRefOf(existing),
      currency: existing.currency,
      primaryAmount: existing.primaryAmountCents === null ? undefined : fromCents(existing.primaryAmountCents),
      categoryId: existing.categoryId,
      counterpartyId: existing.counterpartyId ?? undefined,
      title: existing.title ?? undefined,
      description: existing.description ?? undefined,
      occurredAt: existing.occurredAt.toISOString(),
    },
    input,
  )
  const [row] = await db
    .update(transaction)
    .set(await transactionValues(db, userId, merged))
    .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
    .returning()
  return toTransactionView(row!)
}
