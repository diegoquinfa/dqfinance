import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { category } from '../categories/category.schema'
import { transaction } from '../transactions/transaction.schema'
import { transferType, TRANSFER_TYPES } from './transfer-type'
import { transfer } from './transfer.schema'

export const listTransfersInput = z.object({
  inTransit: z.boolean().optional().describe('Only transfers not yet arrived'),
  type: z.enum(TRANSFER_TYPES).optional(),
  limit: z.number().int().min(1).max(200).optional().describe('Defaults to 50'),
})

const fromProduct = alias(product, 'from_product')
const fromAccount = alias(bankAccount, 'from_account')
const fromBank = alias(bank, 'from_bank')
const fromWallet = alias(cashWallet, 'from_wallet')
const toProduct = alias(product, 'to_product')
const toAccount = alias(bankAccount, 'to_account')
const toBank = alias(bank, 'to_bank')
const toWallet = alias(cashWallet, 'to_wallet')
const toCardProduct = alias(product, 'to_card_product')
const toCardAccount = alias(bankAccount, 'to_card_account')
const toCardBank = alias(bank, 'to_card_bank')

export async function listTransfers(db: Db, userId: string, input: z.infer<typeof listTransfersInput>) {
  const rows = await db
    .select({
      transfer,
      fromName: fromProduct.name,
      fromWalletName: fromWallet.name,
      fromBankId: fromAccount.bankId,
      fromBankName: fromBank.name,
      fromLast4: fromAccount.last4,
      toName: toProduct.name,
      toWalletName: toWallet.name,
      toCardName: card.name,
      toBankId: toAccount.bankId,
      toBankName: toBank.name,
      toLast4: toAccount.last4,
      toCardBankId: toCardAccount.bankId,
      toCardBankName: toCardBank.name,
      toCardOwnLast4: card.last4,
    })
    .from(transfer)
    // Every join hangs off an id taken from the user's own transfer row, so no other user's
    // bank or bank account can be pulled in.
    .leftJoin(fromProduct, eq(fromProduct.id, transfer.fromProductId))
    .leftJoin(fromAccount, eq(fromAccount.id, fromProduct.bankAccountId))
    .leftJoin(fromBank, eq(fromBank.id, fromAccount.bankId))
    .leftJoin(fromWallet, eq(fromWallet.id, transfer.fromCashWalletId))
    .leftJoin(toProduct, eq(toProduct.id, transfer.toProductId))
    .leftJoin(toAccount, eq(toAccount.id, toProduct.bankAccountId))
    .leftJoin(toBank, eq(toBank.id, toAccount.bankId))
    .leftJoin(toWallet, eq(toWallet.id, transfer.toCashWalletId))
    .leftJoin(card, eq(card.id, transfer.toCardId))
    .leftJoin(toCardProduct, eq(toCardProduct.id, card.productId))
    .leftJoin(toCardAccount, eq(toCardAccount.id, toCardProduct.bankAccountId))
    .leftJoin(toCardBank, eq(toCardBank.id, toCardAccount.bankId))
    .where(and(eq(transfer.userId, userId), input.inTransit ? isNull(transfer.receivedAt) : undefined))
    .orderBy(desc(transfer.sentAt))
    .limit(input.limit ?? 50)

  // FX differences live as linked transactions; add them back to show what was actually paid.
  const ids = rows.map((r) => r.transfer.id)
  const fxRows = ids.length
    ? await db
        .select({ transferId: transaction.transferId, type: transaction.type, amountCents: transaction.amountCents })
        .from(transaction)
        .innerJoin(category, eq(category.id, transaction.categoryId))
        .where(and(inArray(transaction.transferId, ids), isNotNull(category.systemKey), inArray(category.systemKey, ['fx_loss', 'fx_gain'])))
    : []
  const fxByTransfer = new Map(fxRows.map((f) => [f.transferId, f.type === 'expense' ? f.amountCents : -f.amountCents]))

  return rows
    .map(({ transfer: t, ...j }) => {
      const fx = fxByTransfer.get(t.id) ?? 0
      const fromType = t.fromProductId ? ('product' as const) : ('cash_wallet' as const)
      const toType = t.toProductId ? ('product' as const) : t.toCashWalletId ? ('cash_wallet' as const) : ('card' as const)
      return {
        id: t.id,
        type: transferType(
          { type: fromType, bankId: j.fromBankId },
          { type: toType, bankId: j.toBankId ?? j.toCardBankId },
        ),
        from: {
          type: fromType,
          id: (t.fromProductId ?? t.fromCashWalletId)!,
          name: (j.fromName ?? j.fromWalletName)!,
          bankName: j.fromBankName ?? null,
          last4: j.fromLast4 ?? null,
        },
        to: {
          type: toType,
          id: (t.toProductId ?? t.toCashWalletId ?? t.toCardId)!,
          name: (j.toName ?? j.toWalletName ?? j.toCardName)!,
          // A card destination borrows the bank of the card's own product, but its digits
          // are the card's own printed last4.
          bankName: (toType === 'card' ? j.toCardBankName : j.toBankName) ?? null,
          last4: (toType === 'card' ? j.toCardOwnLast4 : j.toLast4) ?? null,
        },
        sentAmount: fromCents(t.sentAmountCents + fx),
        sentCurrency: t.sentCurrency,
        receivedAmount: fromCents(t.receivedAmountCents),
        receivedCurrency: t.receivedCurrency,
        fee: t.feeCents === null ? null : fromCents(t.feeCents),
        fxDifference: fx === 0 ? null : fromCents(fx),
        note: t.note,
        sentAt: t.sentAt.toISOString(),
        receivedAt: t.receivedAt?.toISOString() ?? null,
      }
    })
    .filter((t) => !input.type || t.type === input.type)
}
