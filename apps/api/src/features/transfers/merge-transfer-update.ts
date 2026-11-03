import type { CreateTransferInput } from './create-transfer'

/** An edit: every field optional; `null` removes the note or the fee. */
export type TransferPatch = Partial<Omit<CreateTransferInput, 'note' | 'fee'>> & {
  note?: string | null
  fee?: number | null
}

/**
 * The transfer after an edit, in the shape create validates, so an edit obeys the same rules.
 * A field left out keeps its value.
 */
export function mergeTransferUpdate(current: CreateTransferInput, patch: TransferPatch): CreateTransferInput {
  // The arrived amount and the debt currency belong to the destination: a new one needs them again.
  const destinationGiven = patch.to !== undefined && (patch.to.type !== current.to.type || patch.to.id !== current.to.id)
  return {
    from: patch.from ?? current.from,
    to: patch.to ?? current.to,
    amount: patch.amount ?? current.amount,
    receivedAmount: patch.receivedAmount ?? (destinationGiven ? undefined : current.receivedAmount),
    debtCurrency: patch.debtCurrency ?? (destinationGiven ? undefined : current.debtCurrency),
    fee: patch.fee === null ? undefined : (patch.fee ?? current.fee),
    note: patch.note === null ? undefined : (patch.note ?? current.note),
    sentAt: patch.sentAt ?? current.sentAt,
    inTransit: patch.inTransit ?? current.inTransit,
  }
}
