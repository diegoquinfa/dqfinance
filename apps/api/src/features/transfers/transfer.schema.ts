import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { card, cashWallet, product } from '../accounts/account.schema'
import { cents, createdAt, exactlyOne, id, timestamp } from '../../shared/schema-columns'

/** Moving the user's own money between two of their sources. Never income or expense. */
export const transfer = sqliteTable(
  'transfer',
  {
    id: id(),
    userId: ownerId(),
    fromProductId: text('from_product_id').references(() => product.id, { onDelete: 'restrict' }),
    fromCashWalletId: text('from_cash_wallet_id').references(() => cashWallet.id, { onDelete: 'restrict' }),
    toProductId: text('to_product_id').references(() => product.id, { onDelete: 'restrict' }),
    toCashWalletId: text('to_cash_wallet_id').references(() => cashWallet.id, { onDelete: 'restrict' }),
    // Credit card payment.
    toCardId: text('to_card_id').references(() => card.id, { onDelete: 'restrict' }),
    // Excludes the fee and, for a foreign card payment, the FX difference: both are linked transactions
    // on the origin, so the origin loses exactly what was paid and no balance counts anything twice.
    sentAmountCents: cents('sent_amount_cents').notNull(),
    sentCurrency: text('sent_currency').notNull(),
    receivedAmountCents: cents('received_amount_cents').notNull(),
    // For a card payment: the debt currency being paid.
    receivedCurrency: text('received_currency').notNull(),
    feeCents: cents('fee_cents'),
    // Purchase-day value released when paying foreign-currency card debt (design D7).
    costBasisCents: cents('cost_basis_cents'),
    note: text('note'),
    sentAt: timestamp('sent_at').notNull(),
    // Null while in transit.
    receivedAt: timestamp('received_at'),
    createdAt: createdAt(),
  },
  (table) => [
    check('transfer_one_origin', exactlyOne(table.fromProductId, table.fromCashWalletId)),
    check('transfer_one_destination', exactlyOne(table.toProductId, table.toCashWalletId, table.toCardId)),
    index('transfer_user_sent_idx').on(table.userId, table.sentAt),
  ],
)
