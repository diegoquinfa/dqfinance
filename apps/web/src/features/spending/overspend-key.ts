// Pure rule for the overspend line. No imports, so `node --test` runs it as-is.

/**
 * Why the card says the user is over: the money first (bills and set-asides take more than the
 * money in hand), then the monthly target. Null when neither is over, so the card says nothing.
 */
export function overspendKey(data: { daily: number; targetDaily: number | null }) {
  if (data.daily < 0) return 'spending_over_money' as const
  if (data.targetDaily !== null && data.targetDaily < 0) return 'spending_over_target' as const
  return null
}
