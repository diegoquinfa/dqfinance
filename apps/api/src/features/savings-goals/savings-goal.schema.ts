import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { cents, createdAt, id, timestamp } from '../../shared/schema-columns'

/** What the user is saving for. */
export const savingsGoal = sqliteTable(
  'savings_goal',
  {
    id: id(),
    userId: ownerId(),
    name: text('name').notNull(),
    targetCents: cents('target_cents').notNull(),
    currency: text('currency').notNull(),
    // The date the user wants it reached by; null when there is no date.
    targetDate: text('target_date'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    // When the web celebrated the goal being reached; null until then.
    celebratedAt: timestamp('celebrated_at'),
    createdAt: createdAt(),
  },
  (table) => [index('savings_goal_user_idx').on(table.userId)],
)

/** What the user put into a goal. */
export const savingsContribution = sqliteTable(
  'savings_contribution',
  {
    id: id(),
    userId: ownerId(),
    goalId: text('goal_id')
      .notNull()
      .references(() => savingsGoal.id, { onDelete: 'cascade' }),
    amountCents: cents('amount_cents').notNull(),
    // The calendar date the contribution was made on (YYYY-MM-DD, user timezone).
    contributedOn: text('contributed_on').notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('savings_contribution_goal_idx').on(table.goalId)],
)
