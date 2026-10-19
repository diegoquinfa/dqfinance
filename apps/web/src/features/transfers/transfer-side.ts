/** One side of a transfer, as the API returns it. */
export type TransferSide = {
  type: 'product' | 'cash_wallet' | 'card'
  id: string
  name: string
  bankName: string | null
  last4: string | null
}

/**
 * What a side of a transfer shows: the bank leads, the account is the detail.
 * A cash wallet has no bank, so its name leads and there is no detail.
 */
export function transferSideLabel(side: TransferSide): { headline: string; detail: string | null } {
  if (side.type === 'cash_wallet') return { headline: side.name, detail: null }
  return {
    headline: side.bankName ?? side.name,
    detail: side.last4 ? `${side.name} •••• ${side.last4}` : side.name,
  }
}
