import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { card, cashWallet, product } from '../accounts/account.schema'
import { category } from '../categories/category.schema'
import { counterparty } from '../counterparties/counterparty.schema'
import { cents, createdAt, exactlyOne, id } from '../../shared/schema-columns'

export const FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const

export const recurringExpense = sqliteTable(
  'recurring_expense',
  {
    id: id(),
    userId: ownerId(),
    name: text('name').notNull(),
    amountCents: cents('amount_cents').notNull(),
    currency: text('currency').notNull(),
    productId: text('product_id').references(() => product.id, { onDelete: 'restrict' }),
    cashWalletId: text('cash_wallet_id').references(() => cashWallet.id, { onDelete: 'restrict' }),
    cardId: text('card_id').references(() => card.id, { onDelete: 'restrict' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
    counterpartyId: text('counterparty_id').references(() => counterparty.id, { onDelete: 'set null' }),
    frequency: text('frequency', { enum: FREQUENCIES }).notNull(),
    // Calendar dates (YYYY-MM-DD) in the user's timezone.
    startsOn: text('starts_on').notNull(),
    nextDueOn: text('next_due_on').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    check('recurring_expense_one_source', exactlyOne(table.productId, table.cashWalletId, table.cardId)),
    index('recurring_expense_user_due_idx').on(table.userId, table.nextDueOn),
  ],
)
