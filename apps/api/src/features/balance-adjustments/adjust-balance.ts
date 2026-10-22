import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { AppError } from '../../shared/http'
import { currencyCode, fromCents, toCents } from '../../shared/money'
import { resolveSource, sourceColumns, sourceRef } from '../accounts/source'
import { currentBalanceOf } from '../balances/compute-balances'
import { getBalances } from '../balances/get-balances'
import { balanceAdjustment } from './balance-adjustment.schema'

export const adjustBalanceInput = z.object({
  source: sourceRef.describe('A product, cash wallet or credit card'),
  observedBalance: z
    .number()
    .max(1e12)
    .multipleOf(0.01)
    .describe('Real balance now (decimal, not cents); for a credit card the debt owed in `currency` (positive)'),
  currency: currencyCode.optional().describe("Credit cards only: which debt currency (defaults to the card's)"),
  // The balance the user saw. When the balance moved since, the adjustment is refused: two of them
  // must not both apply the same difference.
  expectedBalance: z
    .number()
    .max(1e12)
    .multipleOf(0.01)
    .optional()
    .describe('The balance the user saw (decimal, not cents); the adjustment is refused when it moved'),
  note: z.string().trim().max(200).optional(),
  adjustedAt: isoDateTime.optional(),
})

/** Sets the real balance by recording the difference; movements stay untouched (design D2). */
export async function adjustBalance(db: Db, userId: string, input: z.infer<typeof adjustBalanceInput>) {
  const source = await resolveSource(db, userId, input.source)
  // A debit card has no balance of its own: adjust its product instead.
  if (source.cardKind === 'debit') throw new AppError('credit_card_required')
  const currency = source.cardKind === 'credit' ? (input.currency ?? source.currency) : source.currency

  const current = currentBalanceOf(await getBalances(db, userId), source.ref, currency)
  // The balance the user saw is the one the adjustment was made against. When it has moved, the
  // difference would be wrong, so the adjustment waits for the user to see the new balance.
  if (input.expectedBalance !== undefined && toCents(input.expectedBalance) !== current) {
    throw new AppError('balance_changed', 409)
  }
  const observed = toCents(input.observedBalance)
  const delta = observed - current
  if (delta === 0) return { delta: 0, balance: fromCents(observed) }

  await db.insert(balanceAdjustment).values({
    userId,
    ...sourceColumns(source.ref),
    currency,
    observedBalanceCents: observed,
    deltaCents: delta,
    note: input.note || null,
    adjustedAt: input.adjustedAt ? new Date(input.adjustedAt) : new Date(),
  })
  return { delta: fromCents(delta), balance: fromCents(observed) }
}
