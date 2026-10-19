import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { cents, createdAt, id } from '../../shared/schema-columns'

export const PRODUCT_TYPES = ['savings', 'checking', 'payroll', 'investment', 'other'] as const
export const CARD_KINDS = ['debit', 'credit'] as const

export const bank = sqliteTable('bank', {
  id: id(),
  userId: ownerId(),
  name: text('name').notNull(),
  createdAt: createdAt(),
})

export const bankAccount = sqliteTable(
  'bank_account',
  {
    id: id(),
    userId: ownerId(),
    bankId: text('bank_id')
      .notNull()
      .references(() => bank.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    last4: text('last4'),
    createdAt: createdAt(),
  },
  (table) => [index('bank_account_bank_idx').on(table.bankId)],
)

export const product = sqliteTable(
  'product',
  {
    id: id(),
    userId: ownerId(),
    bankAccountId: text('bank_account_id')
      .notNull()
      .references(() => bankAccount.id, { onDelete: 'restrict' }),
    type: text('type', { enum: PRODUCT_TYPES }).notNull(),
    name: text('name').notNull(),
    currency: text('currency').notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('product_bank_account_idx').on(table.bankAccountId)],
)

export const cashWallet = sqliteTable('cash_wallet', {
  id: id(),
  userId: ownerId(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  createdAt: createdAt(),
})

export const card = sqliteTable(
  'card',
  {
    id: id(),
    userId: ownerId(),
    // Debit cards spend from this product; credit cards use its currency for their limit and primary debt.
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    kind: text('kind', { enum: CARD_KINDS }).notNull(),
    name: text('name').notNull(),
    last4: text('last4'),
    creditLimitCents: cents('credit_limit_cents'),
    statementDay: integer('statement_day'),
    dueDay: integer('due_day'),
    createdAt: createdAt(),
  },
  (table) => [index('card_product_idx').on(table.productId)],
)
