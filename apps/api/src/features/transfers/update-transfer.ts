import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { fromCents, moneyAmount } from '../../shared/money'
import { resolveSource, type SourceRef } from '../accounts/source'
import { category } from '../categories/category.schema'
import { transaction } from '../transactions/transaction.schema'
import { createTransferInput, transferRows, type CreateTransferInput } from './create-transfer'
import { mergeTransferUpdate, type TransferPatch } from './merge-transfer-update'
import { transfer } from './transfer.schema'

export const updateTransferInput = createTransferInput.partial().extend({
  note: z.string().trim().max(200).nullable().optional().describe('null removes the note'),
  fee: moneyAmount.nullable().optional().describe('null removes the fee'),
})

export type UpdateTransferInput = z.infer<typeof updateTransferInput>

/** The MCP tool has no path to take the id from, so it carries it in the input. */
export const updateTransferToolInput = updateTransferInput.extend({ id: z.string().min(1) })

/** The fields that decide what the transfer moved. Anything else changes no balance. */
const sameSource = (a: SourceRef, b: SourceRef) => a.type === b.type && a.id === b.id

/**
 * A transfer of this user, read back in the shape create validates: the stored sent amount leaves
 * the fee and the FX difference out, because they are its linked entries.
 */
async function currentTransfer(db: Db, userId: string, id: string) {
  const row = found(
    await db
      .select()
      .from(transfer)
      .where(and(eq(transfer.id, id), eq(transfer.userId, userId)))
      .get(),
    'transfer_not_found',
  )
  const fxRows = await db
    .select({ type: transaction.type, amountCents: transaction.amountCents })
    .from(transaction)
    .innerJoin(category, eq(category.id, transaction.categoryId))
    .where(and(eq(transaction.transferId, id), inArray(category.systemKey, ['fx_loss', 'fx_gain'])))
  const fx = fxRows.reduce((sum, entry) => sum + (entry.type === 'expense' ? entry.amountCents : -entry.amountCents), 0)
  const input: CreateTransferInput = {
    from: row.fromProductId
      ? { type: 'product', id: row.fromProductId }
      : { type: 'cash_wallet', id: row.fromCashWalletId! },
    to: row.toProductId
      ? { type: 'product', id: row.toProductId }
      : row.toCashWalletId
        ? { type: 'cash_wallet', id: row.toCashWalletId }
        : { type: 'card', id: row.toCardId! },
    amount: fromCents(row.sentAmountCents + fx),
    receivedAmount: fromCents(row.receivedAmountCents),
    debtCurrency: row.toCardId ? row.receivedCurrency : undefined,
    fee: row.feeCents === null ? undefined : fromCents(row.feeCents),
    note: row.note ?? undefined,
    sentAt: row.sentAt.toISOString(),
    inTransit: row.receivedAt === null ? true : undefined,
  }
  return { row, input, fx }
}

/** What decides the money the transfer moved: everything else leaves the fee and FX entries alone. */
const movesMoney = (merged: CreateTransferInput, current: CreateTransferInput) =>
  merged.amount !== current.amount ||
  merged.receivedAmount !== current.receivedAmount ||
  merged.debtCurrency !== current.debtCurrency ||
  merged.fee !== current.fee ||
  !sameSource(merged.from, current.from) ||
  !sameSource(merged.to, current.to)

/**
 * Changes a transfer. A field that moves money rewrites the transfer from the merged values, so the
 * fee and the FX difference follow the new amount and the balances read the payment as if the old
 * one had never existed. Changing only the note or the dates leaves the money alone, and with it the
 * cost basis a card payment released against the debt of its own day.
 */
export async function updateTransfer(db: Db, userId: string, id: string, patch: UpdateTransferInput) {
  const { row, input: current, fx } = await currentTransfer(db, userId, id)
  let effective = patch
  if (patch.from) {
    const [before, after] = await Promise.all([
      resolveSource(db, userId, current.from),
      resolveSource(db, userId, patch.from),
    ])
    if (before.currency !== after.currency) {
      if (patch.amount === undefined) throw new AppError('amount_required')
      // A fee is charged in the origin's currency: the old one means nothing in the new one.
      if (patch.fee === undefined) effective = { ...patch, fee: null }
    }
  }

  const merged = mergeTransferUpdate(current, effective as TransferPatch)
  if (movesMoney(merged, current)) return rewrite(db, userId, id, row, merged)

  const sentAt = merged.sentAt ? new Date(merged.sentAt) : row.sentAt
  const receivedAt = merged.inTransit === true ? null : (row.receivedAt ?? (merged.inTransit === false ? sentAt : null))
  const fields: Partial<typeof transfer.$inferInsert> = {}
  if ((merged.note ?? null) !== row.note) fields.note = merged.note ?? null
  if (sentAt.getTime() !== row.sentAt.getTime()) fields.sentAt = sentAt
  if ((receivedAt?.getTime() ?? null) !== (row.receivedAt?.getTime() ?? null)) fields.receivedAt = receivedAt
  if (Object.keys(fields).length === 0) return { id, fxDifference: fx / 100, fee: feeOf(row) }
  await db.batch([
    db.update(transfer).set(fields).where(and(eq(transfer.id, id), eq(transfer.userId, userId))),
    // The fee and FX entries sit on the day the money left.
    ...(fields.sentAt
      ? [
          db
            .update(transaction)
            .set({ occurredAt: sentAt })
            .where(and(eq(transaction.transferId, id), eq(transaction.userId, userId))),
        ]
      : []),
  ])
  return { id, fxDifference: fx / 100, fee: feeOf(row) }
}

const feeOf = (row: { feeCents: number | null }) => (row.feeCents === null ? null : fromCents(row.feeCents))

/** Writes the transfer and its linked entries again, so the fee and the FX difference follow the new values. */
async function rewrite(
  db: Db,
  userId: string,
  id: string,
  row: { receivedAt: Date | null },
  merged: CreateTransferInput,
) {
  const { values, linked, fxDifference, feeCents } = await transferRows(db, userId, id, merged, {
    excludeTransferId: id,
    // An arrival already recorded keeps its date; a new sending date does not move it.
    receivedAt: merged.inTransit ? null : (row.receivedAt ?? undefined),
  })
  const { id: _id, userId: _userId, ...fields } = values
  await db.batch([
    db.update(transfer).set(fields).where(and(eq(transfer.id, id), eq(transfer.userId, userId))),
    db.delete(transaction).where(and(eq(transaction.transferId, id), eq(transaction.userId, userId))),
    ...(linked.length ? [db.insert(transaction).values(linked)] : []),
  ])
  return { id, fxDifference: fxDifference / 100, fee: feeCents === null ? null : feeCents / 100 }
}
