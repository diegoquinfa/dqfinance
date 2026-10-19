import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { createdAt, id } from '../../shared/schema-columns'

export const CATEGORY_KINDS = ['expense', 'income'] as const
/** Booked automatically: FX difference, bank fees, and the fallback an import uses for uncategorized rows. */
export const SYSTEM_CATEGORY_KEYS = ['fx_loss', 'fx_gain', 'bank_fees', 'other_expense', 'other_income'] as const

export type SystemCategoryKey = (typeof SYSTEM_CATEGORY_KEYS)[number]

export const category = sqliteTable(
  'category',
  {
    id: id(),
    userId: ownerId(),
    // Null for system categories: their name is translated on every read.
    name: text('name'),
    kind: text('kind', { enum: CATEGORY_KINDS }).notNull(),
    systemKey: text('system_key', { enum: SYSTEM_CATEGORY_KEYS }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('category_user_system_key_idx').on(table.userId, table.systemKey)],
)
