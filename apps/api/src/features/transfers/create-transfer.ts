import { z } from 'zod'
import type { Db } from '../../db'
import { isoDateTime } from '../../shared/dates'
import { AppError } from '../../shared/http'
import { currencyCode, moneyAmount, toCents } from '../../shared/money'
import { resolveSource, sourceColumns, sourceKey, sourceRef } from '../accounts/source'
import { cardDebtOf } from '../balances/compute-balances'
import { getBalances } from '../balances/get-balances'
import { systemCategoryId } from '../categories/system-categories'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { transaction } from '../transactions/transaction.schema'
import { settleForeignDebt } from './fx-settlement'
import { transfer } from './transfer.schema'

export const createTransferInput = z.object({
  from: sourceRef.extend({ type: z.enum(['product', 'cash_wallet']) }).describe('Origin: a product or cash wallet'),
  to: sourceRef.describe('Destination: a product, cash wallet or credit card (card payment)'),
  amount: moneyAmount.describe('Decimal amount (not cents) leaving the origin, in its currency, fee excluded'),
  receivedAmount: moneyAmount
    .optional()
    .describe('Amount that arrived, in the destination currency. Required when currencies differ.'),
  debtCurrency: currencyCode
    .optional()
    .describe("Card payments only: which debt currency is paid (defaults to the card's)"),
  fee: moneyAmount.optional().describe('Bank fee on the origin, in its currency'),
  note: z.string().trim().max(200).optional(),
  sentAt: isoDateTime.optional().describe('ISO 8601 datetime; defaults to now'),
  inTransit: z.boolean().optional().describe('True while the money has not arrived (e.g. an interbank transfer)'),
})

export type CreateTransferInput = z.infer<typeof createTransferInput>

export async function createTransfer(db: Db, userId: string, input: CreateTransferInput) {
  const [from, to] = await Promise.all([resolveSource(db, userId, input.from), resolveSource(db, userId, input.to)])
  if (sourceKey(from.ref) === sourceKey(to.ref)) throw new AppError('same_source')
  if (to.ref.type === 'card' && to.cardKind !== 'credit') throw new AppError('credit_card_required')

  const receivedCurrency = to.ref.type === 'card' ? (input.debtCurrency ?? to.currency) : to.currency
  if (receivedCurrency !== to.currency) await assertCurrencyEnabled(db, userId, receivedCurrency)

  const paidCents = toCents(input.amount)
  const sameCurrency = receivedCurrency === from.currency
  if (!sameCurrency && !input.receivedAmount) throw new AppError('received_amount_required')
  const receivedCents = sameCurrency ? paidCents : toCents(input.receivedAmount!)

  // Paying foreign card debt from the card's own currency settles cost basis and may leave an FX difference.
  let costBasis: number | null = null
  let fxDifference = 0
  if (to.ref.type === 'card' && receivedCurrency !== to.currency) {
    const debt = cardDebtOf(await getBalances(db, userId), to.ref.id, receivedCurrency)
    if (from.currency === to.currency) {
      const settled = settleForeignDebt({
        outstandingUnits: debt.units,
        outstandingBasis: debt.basis,
        paidUnits: receivedCents,
        paidPrimary: paidCents,
      })
      costBasis = settled.costBasis
      fxDifference = settled.difference
    } else {
      // shortcut: no FX difference when paying from a third currency (design → known limit).
      costBasis = debt.units > 0 ? Math.round((debt.basis * Math.min(receivedCents, debt.units)) / debt.units) : 0
    }
  }

  const sentAt = input.sentAt ? new Date(input.sentAt) : new Date()
  const transferId = crypto.randomUUID()
  const origin = sourceColumns(from.ref)
  const destination = sourceColumns(to.ref)
  const feeCents = input.fee ? toCents(input.fee) : null

  // Fee and FX difference are transactions on the origin, linked to the transfer.
  const linked: (typeof transaction.$inferInsert)[] = []
  const link = async (type: 'income' | 'expense', amountCents: number, key: 'bank_fees' | 'fx_loss' | 'fx_gain') =>
    linked.push({
      userId,
      type,
      amountCents,
      currency: from.currency,
      ...origin,
      categoryId: await systemCategoryId(db, userId, key),
      transferId,
      occurredAt: sentAt,
    })
  if (feeCents) await link('expense', feeCents, 'bank_fees')
  if (fxDifference > 0) await link('expense', fxDifference, 'fx_loss')
  if (fxDifference < 0) await link('income', -fxDifference, 'fx_gain')

  const insertTransfer = db.insert(transfer).values({
      id: transferId,
      userId,
      fromProductId: origin.productId,
      fromCashWalletId: origin.cashWalletId,
      toProductId: destination.productId,
      toCashWalletId: destination.cashWalletId,
      toCardId: destination.cardId,
      sentAmountCents: paidCents - fxDifference,
      sentCurrency: from.currency,
      receivedAmountCents: receivedCents,
      receivedCurrency,
      feeCents,
      costBasisCents: costBasis,
      note: input.note || null,
      sentAt,
      receivedAt: input.inTransit ? null : sentAt,
    })
  // One batch: the transfer and its linked entries are written together or not at all.
  if (linked.length) await db.batch([insertTransfer, db.insert(transaction).values(linked)])
  else await insertTransfer
  return { id: transferId, fxDifference: fxDifference / 100, fee: feeCents === null ? null : feeCents / 100 }
}
