// Pure money sums for the overview. No imports, so `node --test` runs it as-is.
// Every sum goes through integer cents so decimals never drift.

type Summary = { type: 'income' | 'expense'; currency: string; amount: number }[]

/** Income, expense and net of one currency from the API's summary rows. */
export function totalsIn(rows: Summary, currency: string) {
  const cents = { income: 0, expense: 0 }
  for (const row of rows) if (row.currency === currency) cents[row.type] += Math.round(row.amount * 100)
  return { income: cents.income / 100, expense: cents.expense / 100, net: (cents.income - cents.expense) / 100 }
}

/**
 * Assets (account balances), liabilities (card debts) and net worth per currency. There are no FX
 * rates, so currencies never mix. The primary currency comes first, then the rest alphabetically.
 */
export function netWorth(
  assets: { currency: string; balance: number }[],
  debts: { currency: string; amount: number }[],
  primary: string,
) {
  const cents = new Map<string, { assets: number; liabilities: number }>([[primary, { assets: 0, liabilities: 0 }]])
  const entry = (currency: string) => cents.get(currency) ?? cents.set(currency, { assets: 0, liabilities: 0 }).get(currency)!
  for (const item of assets) entry(item.currency).assets += Math.round(item.balance * 100)
  for (const item of debts) entry(item.currency).liabilities += Math.round(item.amount * 100)
  return [...cents]
    .sort(([a], [b]) => (a === primary ? -1 : b === primary ? 1 : a.localeCompare(b)))
    .map(([currency, total]) => ({
      currency,
      assets: total.assets / 100,
      liabilities: total.liabilities / 100,
      net: (total.assets - total.liabilities) / 100,
    }))
}
