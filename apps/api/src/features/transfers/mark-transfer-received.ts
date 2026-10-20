import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { AppError, found } from '../../shared/http'
import { transfer } from './transfer.schema'

export const markTransferReceivedInput = z.object({
  id: z.string().min(1),
  receivedAt: isoDateTime.optional().describe('Arrival time; defaults to now'),
})

export async function markTransferReceived(db: Db, userId: string, input: z.infer<typeof markTransferReceivedInput>) {
  const row = found(
    await db
      .select({ receivedAt: transfer.receivedAt })
      .from(transfer)
      .where(and(eq(transfer.id, input.id), eq(transfer.userId, userId)))
      .get(),
    'transfer_not_found',
  )
  if (row.receivedAt) throw new AppError('transfer_already_received', 409)
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date()
  await db.update(transfer).set({ receivedAt }).where(eq(transfer.id, input.id))
  return { id: input.id, receivedAt: receivedAt.toISOString() }
}
