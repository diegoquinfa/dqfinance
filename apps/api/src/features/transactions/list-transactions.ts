import { and, desc, eq, gte, lt, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate } from '../../shared/dates'
import type { Locale } from '../../shared/locale'
import { fromCents } from '../../shared/money'
import { card, cashWallet, product } from '../accounts/account.schema'
import { SOURCE_TYPES, sourceRefOf } from '../accounts/source'
import { category } from '../categories/category.schema'
import { categoryName } from '../categories/system-categories'
import { counterparty } from '../counterparties/counterparty.schema'
import { TRANSACTION_TYPES, transaction } from './transaction.schema'

export const listTransactionsInput = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  sourceType: z.enum(SOURCE_TYPES).optional().describe('Filter by source; use together with sourceId'),
  sourceId: z.string().optional(),
  categoryId: z.string().optional(),
  counterpartyId: z.string().optional(),
  from: isoDate.optional().describe('Inclusive start date, YYYY-MM-DD (UTC)'),
  to: isoDate.optional().describe('Exclusive end date, YYYY-MM-DD (UTC)'),
  limit: z.number().int().min(1).max(200).optional().describe('Defaults to 50'),
})

// Currency of the card behind a charge: primaryAmount is expressed in it.
const cardProduct = alias(product, 'card_product')

export async function listTransactions(db: Db, userId: string, locale: Locale, input: z.infer<typeof listTransactionsInput>) {
  const bySource =
    input.sourceType && input.sourceId
      ? input.sourceType === 'product'
        ? // A product's movements include its debit cards' (credit card charges are card debt).
          or(eq(transaction.productId, input.sourceId), and(eq(card.productId, input.sourceId), eq(card.kind, 'debit')))
        : eq(input.sourceType === 'card' ? transaction.cardId : transaction.cashWalletId, input.sourceId)
      : undefined

  const rows = await db
    .select({
      transaction,
      productName: product.name,
      walletName: cashWallet.name,
      cardName: card.name,
      categoryName: category.name,
      categorySystemKey: category.systemKey,
      counterpartyName: counterparty.name,
      counterpartyKind: counterparty.kind,
      cardCurrency: cardProduct.currency,
    })
    .from(transaction)
    .leftJoin(product, eq(product.id, transaction.productId))
    .leftJoin(cashWallet, eq(cashWallet.id, transaction.cashWalletId))
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .innerJoin(category, eq(category.id, transaction.categoryId))
    .leftJoin(counterparty, eq(counterparty.id, transaction.counterpartyId))
    .where(
      and(
        eq(transaction.userId, userId),
        input.type ? eq(transaction.type, input.type) : undefined,
        bySource,
        input.categoryId ? eq(transaction.categoryId, input.categoryId) : undefined,
        input.counterpartyId ? eq(transaction.counterpartyId, input.counterpartyId) : undefined,
        input.from ? gte(transaction.occurredAt, new Date(input.from)) : undefined,
        input.to ? lt(transaction.occurredAt, new Date(input.to)) : undefined,
      ),
    )
    .orderBy(desc(transaction.occurredAt))
    .limit(input.limit ?? 50)

  return rows.map(({ transaction: t, ...joined }) => ({
    id: t.id,
    type: t.type,
    amount: fromCents(t.amountCents),
    currency: t.currency,
    primaryAmount: t.primaryAmountCents === null ? null : fromCents(t.primaryAmountCents),
    // The card's own currency; the charge currency is `currency`.
    primaryCurrency: t.primaryAmountCents === null ? null : (joined.cardCurrency ?? t.currency),
    source: { ...sourceRefOf(t), name: joined.productName ?? joined.walletName ?? joined.cardName ?? '' },
    category: {
      id: t.categoryId,
      name: categoryName({ name: joined.categoryName, systemKey: joined.categorySystemKey }, locale),
      system: joined.categorySystemKey !== null,
    },
    counterparty: t.counterpartyId
      ? { id: t.counterpartyId, name: joined.counterpartyName!, kind: joined.counterpartyKind! }
      : null,
    description: t.description,
    transferId: t.transferId,
    recurringExpenseId: t.recurringExpenseId,
    occurredAt: t.occurredAt.toISOString(),
  }))
}

export type TransactionListItem = Awaited<ReturnType<typeof listTransactions>>[number]
