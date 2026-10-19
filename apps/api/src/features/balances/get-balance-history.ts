import { z } from 'zod'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { SOURCE_TYPES, resolveSource, type SourceRef } from '../accounts/source'
import { assetsAndLiabilities, computeBalancesAt, monthEnds, type Balances } from './compute-balances'
import { getLedger } from './get-balances'

export const balanceHistoryInput = z
  .object({
    months: z
      .number()
      .int()
      .min(1)
      .max(24)
      .optional()
      .describe('How many month-end points to return, ending with the current month. Defaults to 3.'),
    sourceType: z.enum(SOURCE_TYPES).optional().describe('Limit the history to one source; use with sourceId'),
    sourceId: z.string().min(1).optional(),
  })
  .refine((input) => Boolean(input.sourceType) === Boolean(input.sourceId), {
    message: 'sourceType and sourceId go together',
  })

export type BalanceHistoryInput = z.infer<typeof balanceHistoryInput>

export type HistoryPoint = {
  at: Date
  /** One entry per currency holding assets or debt at this point. */
  totals: { currency: string; assetsCents: number; liabilitiesCents: number }[]
  /** The asked-for source's balance, or a card's debt in its own currency; null without a source. */
  source: { currency: string; amountCents: number } | null
}

/**
 * Month-end points, oldest first, from the ledger: assets and liabilities per currency, plus one
 * source's own balance when asked for. The current month's point is "now", not a future month-end.
 */
export async function getBalanceHistory(db: Db, userId: string, input: BalanceHistoryInput): Promise<HistoryPoint[]> {
  const ledger = await getLedger(db, userId)
  const source = input.sourceType && input.sourceId ? await resolveSource(db, userId, { type: input.sourceType, id: input.sourceId }) : null
  // A debit card has no money of its own: its history is its product's. A credit card reports its debt.
  const ref: SourceRef | null = source && (source.cardKind === 'debit' ? { type: 'product', id: source.productId! } : source.ref)
  return monthEnds(input.months ?? 3, new Date()).map((at) => {
    const balances = computeBalancesAt({ ...ledger, at })
    return {
      at,
      totals: assetsAndLiabilities(balances),
      source: source && ref && { currency: source.currency, amountCents: sourceAmount(balances, ref) },
    }
  })
}

/** Decimal amounts for HTTP and MCP responses. */
export const toHistoryView = (points: HistoryPoint[]) =>
  points.map((point) => ({
    at: point.at.toISOString(),
    totals: point.totals.map((total) => ({
      currency: total.currency,
      assets: fromCents(total.assetsCents),
      liabilities: fromCents(total.liabilitiesCents),
    })),
    source: point.source && { currency: point.source.currency, amount: fromCents(point.source.amountCents) },
  }))

/**
 * A card's own debt counts in the card's currency, foreign charges at purchase-day cost, like the
 * overview; a product or cash wallet reports its balance.
 */
const sourceAmount = (balances: Balances, ref: SourceRef) =>
  ref.type === 'card'
    ? (balances.creditCards.find((c) => c.ref.id === ref.id)?.totalCents ?? 0)
    : (balances.accounts.find((a) => a.ref.type === ref.type && a.ref.id === ref.id)?.balanceCents ?? 0)
