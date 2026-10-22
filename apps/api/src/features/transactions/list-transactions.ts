import { and, desc, eq, gte, lt, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate } from '../../shared/dates'
import type { Locale } from '../../shared/locale'
import { fromCents } from '../../shared/money'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { cardProduct } from '../accounts/card-currency'
import { SOURCE_TYPES, sourceRefOf } from '../accounts/source'
import { category } from '../categories/category.schema'
import { categoryName } from '../categories/system-categories'
import { counterparty } from '../counterparties/counterparty.schema'
import { searchFilter } from './search-filter'
import { searchTerms } from './search-terms'
import { TRANSACTION_TYPES, transaction } from './transaction.schema'

/** The words to look for in a movement. */
export const searchQuery = z
  .string()
  .trim()
  .max(200)
  .describe('Words to look for in the title, the description and the category; every word must appear')

export const listTransactionsInput = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  sourceType: z.enum(SOURCE_TYPES).optional().describe('Filter by source; use with sourceId'),
  sourceId: z.string().optional(),
  categoryId: z.string().optional(),
  counterpartyId: z.string().optional(),
  from: isoDate.optional().describe('Inclusive start date, YYYY-MM-DD (UTC)'),
  to: isoDate.optional().describe('Exclusive end date, YYYY-MM-DD (UTC)'),
  q: searchQuery.optional(),
  limit: z.number().int().min(1).max(200).optional().describe('Defaults to 50'),
})

// The bank behind a source: the product's own bank account, and the one of a card's product.
const sourceAccount = alias(bankAccount, 'source_account')
const sourceBank = alias(bank, 'source_bank')
const cardAccount = alias(bankAccount, 'card_account')
const cardBank = alias(bank, 'card_bank')

/** The WHERE of a movement query. The query must left-join `card` on `transaction.cardId`. */
export function transactionFilters(userId: string, input: Omit<z.infer<typeof listTransactionsInput>, 'limit'>) {
  const bySource =
    input.sourceType && input.sourceId
      ? input.sourceType === 'product'
        ? // A product's movements include its debit cards' (credit card charges are card debt).
          or(eq(transaction.productId, input.sourceId), and(eq(card.productId, input.sourceId), eq(card.kind, 'debit')))
        : eq(input.sourceType === 'card' ? transaction.cardId : transaction.cashWalletId, input.sourceId)
      : undefined

  return and(
    eq(transaction.userId, userId),
    input.type ? eq(transaction.type, input.type) : undefined,
    bySource,
    input.categoryId ? eq(transaction.categoryId, input.categoryId) : undefined,
    input.counterpartyId ? eq(transaction.counterpartyId, input.counterpartyId) : undefined,
    input.from ? gte(transaction.occurredAt, new Date(input.from)) : undefined,
    input.to ? lt(transaction.occurredAt, new Date(input.to)) : undefined,
    searchFilter(searchTerms(input.q ?? ''), {
      title: transaction.title,
      description: transaction.description,
      category: category.name,
    }),
  )
}

export async function listTransactions(db: Db, userId: string, locale: Locale, input: z.infer<typeof listTransactionsInput>) {
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
      sourceBankName: sourceBank.name,
      sourceLast4: sourceAccount.last4,
      cardBankName: cardBank.name,
      cardLast4: card.last4,
    })
    .from(transaction)
    .leftJoin(product, eq(product.id, transaction.productId))
    .leftJoin(cashWallet, eq(cashWallet.id, transaction.cashWalletId))
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .innerJoin(category, eq(category.id, transaction.categoryId))
    .leftJoin(counterparty, eq(counterparty.id, transaction.counterpartyId))
    .leftJoin(sourceAccount, eq(sourceAccount.id, product.bankAccountId))
    .leftJoin(sourceBank, eq(sourceBank.id, sourceAccount.bankId))
    .leftJoin(cardAccount, eq(cardAccount.id, cardProduct.bankAccountId))
    .leftJoin(cardBank, eq(cardBank.id, cardAccount.bankId))
    .where(transactionFilters(userId, input))
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
    source: {
      ...sourceRefOf(t),
      name: joined.productName ?? joined.walletName ?? joined.cardName ?? '',
      // The bank the money moved in: null for a cash wallet, which has none.
      bankName: t.productId ? joined.sourceBankName : t.cardId ? joined.cardBankName : null,
      last4: t.productId ? joined.sourceLast4 : t.cardId ? joined.cardLast4 : null,
    },
    category: {
      id: t.categoryId,
      name: categoryName({ name: joined.categoryName, systemKey: joined.categorySystemKey }, locale),
      system: joined.categorySystemKey !== null,
    },
    counterparty: t.counterpartyId
      ? { id: t.counterpartyId, name: joined.counterpartyName!, kind: joined.counterpartyKind! }
      : null,
    title: t.title,
    description: t.description,
    installmentMonths: t.installmentMonths,
    transferId: t.transferId,
    recurringExpenseId: t.recurringExpenseId,
    occurredAt: t.occurredAt.toISOString(),
  }))
}

export type TransactionListItem = Awaited<ReturnType<typeof listTransactions>>[number]
