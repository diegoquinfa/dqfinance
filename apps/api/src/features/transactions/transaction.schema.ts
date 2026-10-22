import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { card, cashWallet, product } from '../accounts/account.schema'
import { category } from '../categories/category.schema'
import { counterparty } from '../counterparties/counterparty.schema'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { transfer } from '../transfers/transfer.schema'
import { cents, createdAt, exactlyOne, id, timestamp } from '../../shared/schema-columns'

export const TRANSACTION_TYPES = ['income', 'expense'] as const

export const transaction = sqliteTable(
  'transaction',
  {
    id: id(),
    userId: ownerId(),
    type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
    // Always positive; `type` carries the sign.
    amountCents: cents('amount_cents').notNull(),
    currency: text('currency').notNull(),
    // Source: exactly one is set (see accounts/source.ts).
    productId: text('product_id').references(() => product.id, { onDelete: 'restrict' }),
    cashWalletId: text('cash_wallet_id').references(() => cashWallet.id, { onDelete: 'restrict' }),
    cardId: text('card_id').references(() => card.id, { onDelete: 'restrict' }),
    // Credit-card charge in a foreign currency: its value in the card's currency on the purchase day.
    primaryAmountCents: cents('primary_amount_cents'),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
    counterpartyId: text('counterparty_id').references(() => counterparty.id, { onDelete: 'set null' }),
    recurringExpenseId: text('recurring_expense_id').references(() => recurringExpense.id, { onDelete: 'set null' }),
    // Fee and FX difference entries created by a transfer; deleted with it.
    transferId: text('transfer_id').references(() => transfer.id, { onDelete: 'cascade' }),
    // The short label that names the movement; the details live in `description`.
    title: text('title'),
    description: text('description'),
    // When the user spreads the expense over several months for budgeting; null when it is paid
    // in one go.
    installmentMonths: integer('installment_months'),
    occurredAt: timestamp('occurred_at').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check('transaction_one_source', exactlyOne(table.productId, table.cashWalletId, table.cardId)),
    index('transaction_user_occurred_idx').on(table.userId, table.occurredAt),
  ],
)
