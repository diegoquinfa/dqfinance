import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { cents, createdAt, id } from '../../shared/schema-columns'

export const PRODUCT_TYPES = ['savings', 'checking', 'payroll', 'investment', 'other'] as const
export const CARD_KINDS = ['debit', 'credit'] as const
export const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'diners', 'other'] as const
/** How a card states its interest: `monthly` (MV) or `annual` (EA). */
export const INTEREST_RATE_PERIODS = ['monthly', 'annual'] as const
/** Presentation only: the UI maps a name to a token. */
export const CARD_COLORS = ['ink', 'signal', 'sand', 'moss', 'clay', 'ocean'] as const

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
    // Effective annual rate (E.A.) in basis points. Feeds an estimate only: it never changes a balance.
    annualRateBps: integer('annual_rate_bps'),
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
    brand: text('brand', { enum: CARD_BRANDS }),
    // The rate the issuer charges, with the period it is stated in (MV / EA). Presentation only.
    interestRateBps: integer('interest_rate_bps'),
    interestRatePeriod: text('interest_rate_period', { enum: INTEREST_RATE_PERIODS }),
    color: text('color', { enum: CARD_COLORS }),
    createdAt: createdAt(),
  },
  (table) => [index('card_product_idx').on(table.productId)],
)
