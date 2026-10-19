export const TRANSFER_TYPES = [
  'own_same_bank',
  'own_other_bank',
  'withdrawal',
  'deposit',
  'cash_exchange',
  'card_payment',
] as const

export type TransferType = (typeof TRANSFER_TYPES)[number]

type End = { type: 'product' | 'cash_wallet' | 'card'; bankId: string | null }

/** Derived from origin and destination, never stored (design D8). */
export function transferType(from: End, to: End): TransferType {
  if (to.type === 'card') return 'card_payment'
  if (from.type === 'cash_wallet') return to.type === 'cash_wallet' ? 'cash_exchange' : 'deposit'
  if (to.type === 'cash_wallet') return 'withdrawal'
  return from.bankId === to.bankId ? 'own_same_bank' : 'own_other_bank'
}
