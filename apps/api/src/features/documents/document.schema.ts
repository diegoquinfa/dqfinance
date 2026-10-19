import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { card, cashWallet, product } from '../accounts/account.schema'
import { createdAt, exactlyOne, id } from '../../shared/schema-columns'

/** A file attached to a source: contract, terms, fee table (design → Later: receipts/attachments). */
export const document = sqliteTable(
  'document',
  {
    id: id(),
    userId: ownerId(),
    // Source: exactly one is set (see accounts/source.ts).
    productId: text('product_id').references(() => product.id, { onDelete: 'restrict' }),
    cashWalletId: text('cash_wallet_id').references(() => cashWallet.id, { onDelete: 'restrict' }),
    cardId: text('card_id').references(() => card.id, { onDelete: 'restrict' }),
    // The name the user uploaded; the object key never comes from it.
    name: text('name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    // Object key in the DOCUMENTS bucket, namespaced by owner.
    r2Key: text('r2_key').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check('document_one_source', exactlyOne(table.productId, table.cashWalletId, table.cardId)),
    index('document_user_idx').on(table.userId),
  ],
)
