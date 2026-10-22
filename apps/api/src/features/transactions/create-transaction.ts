import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { AppError, found } from '../../shared/http'
import { currencyCode, fromCents, moneyAmount, toCents } from '../../shared/money'
import { resolveSource, sourceColumns, sourceRef, sourceRefOf, type ResolvedSource } from '../accounts/source'
import { category } from '../categories/category.schema'
import { counterparty } from '../counterparties/counterparty.schema'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { TRANSACTION_TYPES, transaction } from './transaction.schema'

/** The short label that names a movement in a list. */
export const TITLE_MAX = 120
/** The long free text that holds the details. */
export const DESCRIPTION_MAX = 2000

export const createTransactionInput = z.object({
  type: z.enum(TRANSACTION_TYPES).describe('income adds money, expense removes it; money sent to a person is an expense.'),
  amount: moneyAmount.describe('Positive decimal amount (not cents), in the transaction currency'),
  source: sourceRef.describe('Where the money left from or arrived to; ids from list_accounts.'),
  currency: currencyCode
    .optional()
    .describe("Credit cards only: the charge currency (defaults to the card's). Other sources use their own."),
  primaryAmount: moneyAmount
    .optional()
    .describe("Required for a foreign-currency card charge: the value in the card's currency that day"),
  categoryId: z.string().min(1).describe('From list_categories; kind must match type'),
  counterpartyId: z.string().min(1).optional().describe('Person or business (list_contacts)'),
  title: z.string().trim().max(TITLE_MAX).optional().describe('Short name of the movement, shown in the list'),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX)
    .optional()
    .describe('Longer details about the movement'),
  installmentMonths: z
    .number()
    .int()
    .min(2)
    .max(24)
    .optional()
    .describe('Spread the expense over this many months for the budget; the movement keeps its date and amount'),
  occurredAt: isoDateTime.optional().describe('ISO 8601 datetime; defaults to now'),
})

export type CreateTransactionInput = z.infer<typeof createTransactionInput>

export async function createTransaction(
  db: Db,
  userId: string,
  input: CreateTransactionInput,
  links: { recurringExpenseId?: string } = {},
) {
  const [row] = await db
    .insert(transaction)
    .values({ userId, ...(await transactionValues(db, userId, input)), recurringExpenseId: links.recurringExpenseId })
    .returning()
  return toTransactionView(row!)
}

/** Validates a movement against the user's sources, categories and contacts; the columns to write. Shared by create and update. */
export async function transactionValues(db: Db, userId: string, input: CreateTransactionInput) {
  const source = await resolveSource(db, userId, input.source)
  const currency = chargeCurrency(source, input.currency)
  const foreign = currency !== source.currency
  if (foreign) {
    await assertCurrencyEnabled(db, userId, currency)
    if (!input.primaryAmount) throw new AppError('primary_amount_required')
  }

  const categoryRow = found(
    await db
      .select({ kind: category.kind })
      .from(category)
      .where(and(eq(category.id, input.categoryId), eq(category.userId, userId)))
      .get(),
    'category_not_found',
  )
  if (categoryRow.kind !== input.type) throw new AppError('category_kind_mismatch')
  if (input.counterpartyId) {
    found(
      await db
        .select({ id: counterparty.id })
        .from(counterparty)
        .where(and(eq(counterparty.id, input.counterpartyId), eq(counterparty.userId, userId)))
        .get(),
      'counterparty_not_found',
    )
  }

  return {
    type: input.type,
    amountCents: toCents(input.amount),
    currency,
    ...sourceColumns(source.ref),
    primaryAmountCents: foreign ? toCents(input.primaryAmount!) : null,
    categoryId: input.categoryId,
    counterpartyId: input.counterpartyId ?? null,
    title: input.title || null,
    description: input.description || null,
    installmentMonths: input.installmentMonths ?? null,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
  }
}

/** Products, cash wallets and debit cards use their own currency; credit cards may charge in another one. */
export function chargeCurrency(source: ResolvedSource, requested: string | undefined) {
  if (!requested || requested === source.currency) return source.currency
  if (source.cardKind !== 'credit') throw new AppError('credit_card_required')
  return requested
}

export const toTransactionView = (row: typeof transaction.$inferSelect) => ({
  id: row.id,
  type: row.type,
  amount: fromCents(row.amountCents),
  currency: row.currency,
  primaryAmount: row.primaryAmountCents === null ? null : fromCents(row.primaryAmountCents),
  source: sourceRefOf(row),
  categoryId: row.categoryId,
  counterpartyId: row.counterpartyId,
  title: row.title,
  description: row.description,
  installmentMonths: row.installmentMonths,
  occurredAt: row.occurredAt.toISOString(),
})
