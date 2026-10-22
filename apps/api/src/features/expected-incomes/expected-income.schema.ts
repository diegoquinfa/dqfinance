import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { cents, createdAt, id } from '../../shared/schema-columns'
import { INCOME_FREQUENCIES } from './income-frequency'

/** An income the user expects: a salary, an invoice, a rent. */
export const expectedIncome = sqliteTable(
  'expected_income',
  {
    id: id(),
    userId: ownerId(),
    name: text('name').notNull(),
    amountCents: cents('amount_cents').notNull(),
    currency: text('currency').notNull(),
    frequency: text('frequency', { enum: INCOME_FREQUENCIES }).notNull(),
    // The date the next one arrives (YYYY-MM-DD, user timezone). For a regular income it is the
    // anchor the occurrences are counted from.
    nextOn: text('next_on').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [index('expected_income_user_idx').on(table.userId)],
)
