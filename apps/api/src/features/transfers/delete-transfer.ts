import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { transaction } from '../transactions/transaction.schema'
import { transfer } from './transfer.schema'

export const deleteTransferInput = z.object({ id: z.string().min(1) })

/**
 * Deletes a transfer recorded by mistake. Its fee and FX entries go with it, so both balances go
 * back to what they were: nothing else is stored, every balance is derived from these rows.
 */
export async function deleteTransfer(db: Db, userId: string, id: string) {
  const row = await db
    .select({ id: transfer.id })
    .from(transfer)
    .where(and(eq(transfer.id, id), eq(transfer.userId, userId)))
    .get()
  found(row, 'transfer_not_found')
  await db.batch([
    db.delete(transaction).where(and(eq(transaction.transferId, id), eq(transaction.userId, userId))),
    db.delete(transfer).where(and(eq(transfer.id, id), eq(transfer.userId, userId))),
  ])
  return { id, deleted: true }
}
