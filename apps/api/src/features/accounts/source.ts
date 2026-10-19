import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError } from '../../shared/http'
import { bankAccount, card, cashWallet, product } from './account.schema'

/**
 * Source module: where money moves from or to (a product, a cash wallet, or a card).
 * Callers pass a SourceRef; this module owns ownership checks, currency, and the
 * three-nullable-FK storage shape (see GLOSSARY.md → Source).
 */
export const SOURCE_TYPES = ['product', 'cash_wallet', 'card'] as const

export const sourceRef = z.object({
  type: z.enum(SOURCE_TYPES),
  id: z.string().min(1),
})

export type SourceRef = z.infer<typeof sourceRef>

export type ResolvedSource = {
  ref: SourceRef
  name: string
  currency: string
  /** Bank of the product or card; null for cash. */
  bankId: string | null
  /** The product itself, or the card's product; null for cash. */
  productId: string | null
  cardKind: 'debit' | 'credit' | null
}

export type SourceColumns = { productId: string | null; cashWalletId: string | null; cardId: string | null }

/** Loads an owned source; throws AppError('source_not_found') when it does not exist or belongs to someone else. */
export async function resolveSource(db: Db, userId: string, ref: SourceRef): Promise<ResolvedSource> {
  const row = await findSource(db, userId, ref)
  if (!row) throw new AppError('source_not_found', 404)
  return { ref, ...row }
}

async function findSource(db: Db, userId: string, ref: SourceRef) {
  if (ref.type === 'cash_wallet') {
    const wallet = await db
      .select()
      .from(cashWallet)
      .where(and(eq(cashWallet.id, ref.id), eq(cashWallet.userId, userId)))
      .get()
    return wallet && { name: wallet.name, currency: wallet.currency, bankId: null, productId: null, cardKind: null }
  }
  if (ref.type === 'product') {
    const row = await db
      .select({ name: product.name, currency: product.currency, bankId: bankAccount.bankId })
      .from(product)
      .innerJoin(bankAccount, eq(bankAccount.id, product.bankAccountId))
      .where(and(eq(product.id, ref.id), eq(product.userId, userId)))
      .get()
    return row && { ...row, productId: ref.id, cardKind: null }
  }
  return db
    .select({
      name: card.name,
      currency: product.currency,
      bankId: bankAccount.bankId,
      productId: card.productId,
      cardKind: card.kind,
    })
    .from(card)
    .innerJoin(product, eq(product.id, card.productId))
    .innerJoin(bankAccount, eq(bankAccount.id, product.bankAccountId))
    .where(and(eq(card.id, ref.id), eq(card.userId, userId)))
    .get()
}

/** The storage shape: exactly one of the three foreign keys is set. */
export const sourceColumns = (ref: SourceRef): SourceColumns => ({
  productId: ref.type === 'product' ? ref.id : null,
  cashWalletId: ref.type === 'cash_wallet' ? ref.id : null,
  cardId: ref.type === 'card' ? ref.id : null,
})

/** Inverse of sourceColumns, for rows read back from the database. */
export function sourceRefOf(columns: SourceColumns): SourceRef {
  if (columns.productId) return { type: 'product', id: columns.productId }
  if (columns.cashWalletId) return { type: 'cash_wallet', id: columns.cashWalletId }
  return { type: 'card', id: columns.cardId! }
}

/** Stable map key for a source, e.g. "product:abc". */
export const sourceKey = (ref: SourceRef) => `${ref.type}:${ref.id}`
