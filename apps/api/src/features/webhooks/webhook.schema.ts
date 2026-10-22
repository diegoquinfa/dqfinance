import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { createdAt, id } from '../../shared/schema-columns'

/** A place the user asked the app to talk to: their own automation. */
export const webhook = sqliteTable(
  'webhook',
  {
    id: id(),
    userId: ownerId(),
    // The public https URL the app calls.
    url: text('url').notNull(),
    // The secret the signature is made with. It never leaves the app: only its last characters are
    // shown, so the user can tell two hooks apart.
    secret: text('secret').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [index('webhook_user_idx').on(table.userId)],
)
