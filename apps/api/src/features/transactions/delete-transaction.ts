import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { transaction } from './transaction.schema'
import { editableTransaction } from './update-transaction'

export const deleteTransactionInput = z.object({ id: z.string().min(1) })

/** Deletes a movement recorded by mistake. A movement of another user is not found. */
export async function deleteTransaction(db: Db, userId: string, id: string) {
  await editableTransaction(db, userId, id)
  await db.delete(transaction).where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
  return { id, deleted: true }
}
