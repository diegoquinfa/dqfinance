import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError } from '../../shared/http'
import { publicUrl } from '../../shared/public-url'
import { pushSubscription } from './push-subscription.schema'

export const savePushSubscriptionInput = z.object({
  endpoint: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => publicUrl(value) !== null, 'The push endpoint must be a public https URL'),
  p256dh: z.string().min(1).max(200).describe('Base64url client public key from PushSubscription.getKey'),
  auth: z.string().min(1).max(100).describe('Base64url auth secret from PushSubscription.getKey'),
})

/**
 * The endpoint, not the user, identifies the browser: re-subscribing updates the keys.
 * The owner never changes: an endpoint registered by another account is refused, not taken.
 */
export async function savePushSubscription(db: Db, userId: string, input: z.infer<typeof savePushSubscriptionInput>) {
  const [existing] = await db
    .select({ userId: pushSubscription.userId })
    .from(pushSubscription)
    .where(eq(pushSubscription.endpoint, input.endpoint))
    .limit(1)
  if (existing && existing.userId !== userId) throw new AppError('push_subscription_owned', 409)
  await db
    .insert(pushSubscription)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { p256dh: input.p256dh, auth: input.auth },
      // The row keeps its owner: the update only reaches a subscription of this account.
      setWhere: eq(pushSubscription.userId, userId),
    })
  return input
}
