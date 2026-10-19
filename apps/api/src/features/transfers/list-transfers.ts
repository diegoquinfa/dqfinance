import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { category } from '../categories/category.schema'
import { transaction } from '../transactions/transaction.schema'
import { transferType, TRANSFER_TYPES } from './transfer-type'
import { transfer } from './transfer.schema'

export const listTransfersInput = z.object({
  inTransit: z.boolean().optional().describe('Only transfers that have not arrived yet'),
  type: z.enum(TRANSFER_TYPES).optional(),
  limit: z.number().int().min(1).max(200).optional().describe('Defaults to 50'),
})

const fromProduct = alias(product, 'from_product')
const fromAccount = alias(bankAccount, 'from_account')
const fromWallet = alias(cashWallet, 'from_wallet')
const toProduct = alias(product, 'to_product')
const toAccount = alias(bankAccount, 'to_account')
const toWallet = alias(cashWallet, 'to_wallet')
const toCardProduct = alias(product, 'to_card_product')
const toCardAccount = alias(bankAccount, 'to_card_account')

export async function listTransfers(db: Db, userId: string, input: z.infer<typeof listTransfersInput>) {
  const rows = await db
    .select({
      transfer,
      fromName: fromProduct.name,
      fromWalletName: fromWallet.name,
      fromBankId: fromAccount.bankId,
      toName: toProduct.name,
      toWalletName: toWallet.name,
      toCardName: card.name,
      toBankId: toAccount.bankId,
      toCardBankId: toCardAccount.bankId,
    })
    .from(transfer)
    .leftJoin(fromProduct, eq(fromProduct.id, transfer.fromProductId))
    .leftJoin(fromAccount, eq(fromAccount.id, fromProduct.bankAccountId))
    .leftJoin(fromWallet, eq(fromWallet.id, transfer.fromCashWalletId))
    .leftJoin(toProduct, eq(toProduct.id, transfer.toProductId))
    .leftJoin(toAccount, eq(toAccount.id, toProduct.bankAccountId))
    .leftJoin(toWallet, eq(toWallet.id, transfer.toCashWalletId))
    .leftJoin(card, eq(card.id, transfer.toCardId))
    .leftJoin(toCardProduct, eq(toCardProduct.id, card.productId))
    .leftJoin(toCardAccount, eq(toCardAccount.id, toCardProduct.bankAccountId))
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
        from: { type: fromType, id: (t.fromProductId ?? t.fromCashWalletId)!, name: (j.fromName ?? j.fromWalletName)! },
        to: {
          type: toType,
          id: (t.toProductId ?? t.toCashWalletId ?? t.toCardId)!,
          name: (j.toName ?? j.toWalletName ?? j.toCardName)!,
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
