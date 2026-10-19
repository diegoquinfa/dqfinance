import { z } from 'zod'
import type { Db } from '../../db'
import { pushSubscription } from './push-subscription.schema'

export const savePushSubscriptionInput = z.object({
  endpoint: z.string().trim().min(1).max(2048),
  p256dh: z.string().min(1).max(200).describe('Base64url client public key from PushSubscription.getKey'),
  auth: z.string().min(1).max(100).describe('Base64url auth secret from PushSubscription.getKey'),
})

/** The endpoint, not the user, identifies the browser: re-subscribing updates the keys and reassigns the owner. */
export async function savePushSubscription(db: Db, userId: string, input: z.infer<typeof savePushSubscriptionInput>) {
  await db
    .insert(pushSubscription)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId, p256dh: input.p256dh, auth: input.auth },
    })
  return input
}
