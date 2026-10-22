import type { CreateTransactionInput } from './create-transaction'

/** An edit: every field optional; `null` removes the contact, the title or the description. */
export type TransactionPatch = Partial<
  Omit<CreateTransactionInput, 'counterpartyId' | 'title' | 'description' | 'installmentMonths'>
> & {
  counterpartyId?: string | null
  title?: string | null
  description?: string | null
  /** null puts the expense back in one go. */
  installmentMonths?: number | null
}

/**
 * The movement after an edit, in the shape create validates, so an edit obeys the same rules.
 * A field left out keeps its value. A new source charges in its own currency and drops the old
 * primary amount (it was in the old card's currency), unless the patch names them.
 */
export function mergeTransactionUpdate(current: CreateTransactionInput, patch: TransactionPatch): CreateTransactionInput {
  const sourceGiven = patch.source !== undefined
  return {
    type: patch.type ?? current.type,
    amount: patch.amount ?? current.amount,
    source: patch.source ?? current.source,
    currency: patch.currency ?? (sourceGiven ? undefined : current.currency),
    primaryAmount: patch.primaryAmount ?? (sourceGiven ? undefined : current.primaryAmount),
    categoryId: patch.categoryId ?? current.categoryId,
    counterpartyId: patch.counterpartyId === null ? undefined : (patch.counterpartyId ?? current.counterpartyId),
    title: patch.title === null ? undefined : (patch.title ?? current.title),
    description: patch.description === null ? undefined : (patch.description ?? current.description),
    installmentMonths:
      patch.installmentMonths === null ? undefined : (patch.installmentMonths ?? current.installmentMonths),
    occurredAt: patch.occurredAt ?? current.occurredAt,
  }
}
