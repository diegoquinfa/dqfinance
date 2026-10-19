/**
 * Settles part of a credit card's foreign-currency debt (design D7).
 * All amounts are cents; `paidPrimary` and the results are in the card's currency.
 *
 * - Covered units release their share of the outstanding cost basis (average cost).
 * - Units paid beyond the outstanding debt (a prepayment) are valued at the payment's own rate.
 * - difference > 0 is an FX loss (paid more than the purchase-day value); < 0 is a gain.
 */
export function settleForeignDebt(input: {
  outstandingUnits: number
  outstandingBasis: number
  paidUnits: number
  paidPrimary: number
}): { costBasis: number; difference: number } {
  const { outstandingUnits, outstandingBasis, paidUnits, paidPrimary } = input
  const coveredUnits = Math.min(paidUnits, Math.max(outstandingUnits, 0))
  const coveredBasis = coveredUnits > 0 ? Math.round((outstandingBasis * coveredUnits) / outstandingUnits) : 0
  const extraUnits = paidUnits - coveredUnits
  const extraBasis = extraUnits > 0 ? Math.round((paidPrimary * extraUnits) / paidUnits) : 0
  const costBasis = coveredBasis + extraBasis
  return { costBasis, difference: paidPrimary - costBasis }
}
