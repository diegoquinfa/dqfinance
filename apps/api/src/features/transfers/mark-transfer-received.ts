import { and, eq, isNull } from 'drizzle-orm'
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
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date()
  // The guard is in the write itself: two calls at once cannot both mark it received.
  const updated = await db
    .update(transfer)
    .set({ receivedAt })
    .where(and(eq(transfer.id, input.id), eq(transfer.userId, userId), isNull(transfer.receivedAt)))
    .returning({ id: transfer.id })
  if (updated.length === 0) {
    // Either the transfer is not there, or somebody else already received it.
    found(
      await db
        .select({ receivedAt: transfer.receivedAt })
        .from(transfer)
        .where(and(eq(transfer.id, input.id), eq(transfer.userId, userId)))
        .get(),
      'transfer_not_found',
    )
    throw new AppError('transfer_already_received', 409)
  }
  return { id: input.id, receivedAt: receivedAt.toISOString() }
}
