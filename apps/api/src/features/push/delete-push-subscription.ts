import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError } from '../../shared/http'
import { pushSubscription } from './push-subscription.schema'

export const deletePushSubscriptionInput = z.object({
  endpoint: z.string().trim().min(1).max(2048),
})

export async function deletePushSubscription(
  db: Db,
  userId: string,
  input: z.infer<typeof deletePushSubscriptionInput>,
) {
  const [row] = await db
    .select({ id: pushSubscription.id })
    .from(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, input.endpoint)))
  if (!row) throw new AppError('not_found', 404)
  await db.delete(pushSubscription).where(eq(pushSubscription.id, row.id))
  return { endpoint: input.endpoint }
}
