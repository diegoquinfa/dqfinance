/**
 * Pure estimate of what a balance earns at an effective annual rate (E.A.), in basis points.
 * An estimate only: the real interest arrives as income or an adjustment (design D1/D2).
 */
export function estimateYield(balanceCents: number, annualRateBps: number | null) {
  if (annualRateBps === null) return null
  const rate = annualRateBps / 10_000
  const per = (periods: number) => Math.round(balanceCents * ((1 + rate) ** (1 / periods) - 1))
  return { monthlyCents: per(12), dailyCents: per(365) }
}
