// Pure rule for chart axes. No imports, so `node --test` runs it as-is.

/**
 * How many significant digits a compact axis label needs so that neighbouring ticks never read the
 * same: a balance that moves 100,000 around 5,300,000 needs "5,34 M", not "5,3 M" four times. One
 * more digit than the orders of magnitude between the largest value and the gap between ticks.
 */
export const axisSignificantDigits = (values: number[], tickCount: number): number => {
  const largest = Math.max(...values.map(Math.abs))
  const step = (Math.max(...values) - Math.min(...values)) / Math.max(1, tickCount - 1)
  if (!largest || !step) return 2
  return Math.min(6, Math.max(2, Math.ceil(Math.log10(largest / step)) + 1))
}
