import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from '../auth/auth.schema'
import { ownerId } from '../auth/owner'
import { createdAt, timestamp } from '../../shared/schema-columns'

export const LOCALES = ['en', 'es'] as const

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  // ISO 3166-1 alpha-2, e.g. CO.
  country: text('country').notNull(),
  locale: text('locale', { enum: LOCALES }).notNull(),
  // IANA timezone; "today" for recurring expenses is computed in it.
  timezone: text('timezone').notNull(),
  primaryCurrency: text('primary_currency').notNull(),
  onboardedAt: timestamp('onboarded_at').notNull(),
})

export const userCurrency = sqliteTable(
  'user_currency',
  {
    userId: ownerId(),
    code: text('code').notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.code] })],
)
