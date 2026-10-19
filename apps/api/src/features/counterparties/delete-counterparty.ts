import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { counterparty } from './counterparty.schema'

export const deleteCounterpartyInput = z.object({ id: z.string().min(1) })

/**
 * Deletes a contact. Its movements survive: their counterparty is set to null, so they only lose the name.
 * A contact of another user is not found.
 */
export async function deleteCounterparty(db: Db, userId: string, id: string) {
  found(
    await db
      .select({ id: counterparty.id })
      .from(counterparty)
      .where(and(eq(counterparty.id, id), eq(counterparty.userId, userId)))
      .get(),
    'counterparty_not_found',
  )
  await db.delete(counterparty).where(and(eq(counterparty.id, id), eq(counterparty.userId, userId)))
  return { id, deleted: true }
}
