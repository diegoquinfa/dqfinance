import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { card } from '../accounts/account.schema'
import { cents, createdAt, id } from '../../shared/schema-columns'

/**
 * What a credit card's statement asks the user to pay after one cut (design D16). The bank already
 * folded every purchase's installment, its rate and the earlier extra payments into it, so the app
 * takes the number instead of deriving it. One statement per card and cut.
 */
export const cardStatement = sqliteTable(
  'card_statement',
  {
    id: id(),
    userId: ownerId(),
    cardId: text('card_id')
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    // The cut the statement closed on and the day it must be paid (YYYY-MM-DD, user timezone).
    closedOn: text('closed_on').notNull(),
    dueOn: text('due_on').notNull(),
    // The payment the user will make, in the card's currency: the statement's minimum, or more.
    paymentCents: cents('payment_cents').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('card_statement_user_idx').on(table.userId),
    uniqueIndex('card_statement_card_cut_idx').on(table.cardId, table.closedOn),
  ],
)
