import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { card, cashWallet, product } from '../accounts/account.schema'
import { cents, createdAt, exactlyOne, id, timestamp } from '../../shared/schema-columns'

/** "Edit balance": records the real balance and the correction, never rewriting movements (design D2). */
export const balanceAdjustment = sqliteTable(
  'balance_adjustment',
  {
    id: id(),
    userId: ownerId(),
    productId: text('product_id').references(() => product.id, { onDelete: 'restrict' }),
    cashWalletId: text('cash_wallet_id').references(() => cashWallet.id, { onDelete: 'restrict' }),
    cardId: text('card_id').references(() => card.id, { onDelete: 'restrict' }),
    currency: text('currency').notNull(),
    // Signed. For a card it is the debt (positive = owed).
    observedBalanceCents: cents('observed_balance_cents').notNull(),
    // Signed correction added to the computed balance.
    deltaCents: cents('delta_cents').notNull(),
    note: text('note'),
    adjustedAt: timestamp('adjusted_at').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check('balance_adjustment_one_source', exactlyOne(table.productId, table.cashWalletId, table.cardId)),
    index('balance_adjustment_user_idx').on(table.userId),
  ],
)
