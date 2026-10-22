import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { category } from '../categories/category.schema'
import { cents, createdAt, id } from '../../shared/schema-columns'

/** What the user wants to spend in a category, every month. */
export const budget = sqliteTable(
  'budget',
  {
    id: id(),
    userId: ownerId(),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
    amountCents: cents('amount_cents').notNull(),
    currency: text('currency').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('budget_user_idx').on(table.userId),
    uniqueIndex('budget_user_category_idx').on(table.userId, table.categoryId),
  ],
)
