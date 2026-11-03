import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { AppError } from '../../shared/http'
import { currencyCode, fromCents, toCents } from '../../shared/money'
import { resolveSource, sourceRef } from '../accounts/source'
import { computeBalances, computeBalancesAt, currentBalanceOf } from '../balances/compute-balances'
import { getLedger } from '../balances/get-balances'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { claimAdjustment } from './adjustment-claim'

export const adjustBalanceInput = z.object({
  source: sourceRef.describe('A product, cash wallet or credit card'),
  observedBalance: z
    .number()
    .max(1e12)
    .multipleOf(0.01)
    .describe(
      'Real balance at `adjustedAt`, now by default (decimal, not cents); for a credit card the debt owed in `currency` (positive)',
    ),
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
  // The source's own currency is enabled already; a debt currency the caller names must be too.
  if (currency !== source.currency) await assertCurrencyEnabled(db, userId, currency)

  // The instant the balance is read, so the write can refuse a correction that read the same one.
  const readAt = Date.now()
  const ledger = await getLedger(db, userId)
  const now = currentBalanceOf(computeBalances(ledger), source.ref, currency)
  // The balance the user saw is the one the adjustment was made against. When it has moved, the
  // difference would be wrong, so the adjustment waits for the user to see the new balance.
  if (input.expectedBalance !== undefined && toCents(input.expectedBalance) !== now) {
    throw new AppError('balance_changed', 409)
  }
  // The observed balance belongs to the adjustment's own instant (design D2), so a backdated one is
  // compared with the balance at that date; the movements after it still count on top.
  const adjustedAt = input.adjustedAt ? new Date(input.adjustedAt) : new Date()
  const current = input.adjustedAt ? currentBalanceOf(computeBalancesAt({ ...ledger, at: adjustedAt }), source.ref, currency) : now
  const observed = toCents(input.observedBalance)
  const delta = observed - current
  if (delta === 0) return { delta: 0, balance: fromCents(now) }

  const result = await db.run(
    claimAdjustment(
      {
        id: crypto.randomUUID(),
        userId,
        ref: source.ref,
        currency,
        observedCents: observed,
        deltaCents: delta,
        note: input.note || null,
        adjustedAt: adjustedAt.getTime(),
        createdAt: Date.now(),
      },
      readAt,
    ),
  )
  // The row is written only when nothing adjusted this balance after the read, so two tabs that
  // sent the same correction write one row, not two.
  if ((result.meta.changes ?? 0) === 0) throw new AppError('balance_changed', 409)
  return { delta: fromCents(delta), balance: fromCents(now + delta) }
}
