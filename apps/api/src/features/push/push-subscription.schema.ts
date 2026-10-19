import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { createdAt, id } from '../../shared/schema-columns'

/** A browser's Web Push endpoint. Unique per browser, so a stale row is reassigned to the signed-in user. */
export const pushSubscription = sqliteTable(
  'push_subscription',
  {
    id: id(),
    userId: ownerId(),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('push_subscription_user_idx').on(table.userId)],
)
