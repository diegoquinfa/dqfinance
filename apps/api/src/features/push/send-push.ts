import { buildPushPayload, type PushMessage } from '@block65/webcrypto-web-push'
import { eq } from 'drizzle-orm'
import type { Db } from '../../db'
import type { Locale } from '../../shared/locale'
import { expiredPushStatus } from './expired-push-status'
import type { PushConfig } from './push-config'
import { pushSubscription } from './push-subscription.schema'
import { pushCopy, type PushKind } from './push-copy'

/**
 * One notification after a write that changes balances. It never throws: the write already landed, so a
 * failed push is logged and the remaining subscriptions are still tried.
 */
export async function sendPush(
  db: Db,
  userId: string,
  locale: Locale,
  config: PushConfig | null,
  kind: PushKind = 'expense',
) {
  if (!config) return
  try {
    const subscriptions = await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId))
    const message: PushMessage = {
      data: pushCopy(kind, locale),
      options: { ttl: 60, urgency: 'normal' },
    }
    await Promise.all(
      subscriptions.map(async (row) => {
        try {
          const payload = await buildPushPayload(
            message,
            { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } },
            config,
          )
          const response = await fetch(row.endpoint, payload)
          if (expiredPushStatus(response.status)) {
            await db.delete(pushSubscription).where(eq(pushSubscription.id, row.id))
          } else if (!response.ok) {
            console.error(`push send failed for subscription ${row.id}: ${response.status}`)
          }
        } catch (error) {
          console.error(`push send failed for subscription ${row.id}`, error)
        }
      }),
    )
  } catch (error) {
    console.error(`push notification failed for user ${userId}`, error)
  }
}
