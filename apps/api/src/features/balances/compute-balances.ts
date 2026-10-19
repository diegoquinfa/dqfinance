import type { SourceRef } from '../accounts/source'

const sourceKey = (ref: SourceRef) => `${ref.type}:${ref.id}`

/**
 * Pure core of the Balances module: applies the balance rules of design D1 to every movement row.
 * All amounts are integer cents.
 */
export type Ledger = {
  products: { id: string; name: string; bankName: string; currency: string }[]
  cashWallets: { id: string; name: string; currency: string }[]
  cards: { id: string; name: string; kind: 'debit' | 'credit'; productId: string; currency: string; creditLimitCents: number | null }[]
  transactions: {
    type: 'income' | 'expense'
    amountCents: number
    currency: string
    primaryAmountCents: number | null
    productId: string | null
    cashWalletId: string | null
    cardId: string | null
  }[]
  transfers: {
    fromProductId: string | null
    fromCashWalletId: string | null
    toProductId: string | null
    toCashWalletId: string | null
    toCardId: string | null
    sentAmountCents: number
    sentCurrency: string
    receivedAmountCents: number
    receivedCurrency: string
    costBasisCents: number | null
    receivedAt: Date | null
  }[]
  adjustments: { productId: string | null; cashWalletId: string | null; cardId: string | null; currency: string; deltaCents: number }[]
}

export type CardDebt = {
  currency: string
  amountCents: number
  /** Purchase-day value in the card's currency; only for foreign currencies. */
  costBasisCents: number | null
}

export type Balances = {
  accounts: { ref: SourceRef; name: string; bankName: string | null; currency: string; balanceCents: number }[]
  creditCards: {
    ref: SourceRef
    name: string
    currency: string
    creditLimitCents: number | null
    debts: CardDebt[]
    /** Debt in the card's currency plus the cost basis of foreign debt. */
    totalCents: number
    availableCents: number | null
  }[]
  inTransit: { currency: string; amountCents: number }[]
}

export function computeBalances(ledger: Ledger): Balances {
  const balance = new Map<string, number>()
  const debt = new Map<string, Map<string, { units: number; basis: number }>>()
  const inTransit = new Map<string, number>()
  const cards = new Map(ledger.cards.map((c) => [c.id, c]))

  const addBalance = (ref: SourceRef, cents: number) => balance.set(sourceKey(ref), (balance.get(sourceKey(ref)) ?? 0) + cents)
  const addDebt = (cardId: string, currency: string, units: number, basis: number) => {
    const perCurrency = debt.get(cardId) ?? new Map()
    const entry = perCurrency.get(currency) ?? { units: 0, basis: 0 }
    perCurrency.set(currency, { units: entry.units + units, basis: entry.basis + basis })
    debt.set(cardId, perCurrency)
  }
  // Movements on a debit card belong to its product's balance.
  const balanceRef = (row: { productId: string | null; cashWalletId: string | null; cardId: string | null }): SourceRef | null => {
    if (row.productId) return { type: 'product', id: row.productId }
    if (row.cashWalletId) return { type: 'cash_wallet', id: row.cashWalletId }
    const owner = cards.get(row.cardId!)
    return owner?.kind === 'debit' ? { type: 'product', id: owner.productId } : null
  }

  for (const t of ledger.transactions) {
    const sign = t.type === 'income' ? 1 : -1
    const ref = balanceRef(t)
    if (ref) {
      addBalance(ref, sign * t.amountCents)
      continue
    }
    const owner = cards.get(t.cardId!)
    if (!owner) continue
    const foreign = t.currency !== owner.currency
    addDebt(owner.id, t.currency, -sign * t.amountCents, foreign ? -sign * (t.primaryAmountCents ?? 0) : 0)
  }

  for (const t of ledger.transfers) {
    const from: SourceRef = t.fromProductId
      ? { type: 'product', id: t.fromProductId }
      : { type: 'cash_wallet', id: t.fromCashWalletId! }
    addBalance(from, -t.sentAmountCents)
    if (!t.receivedAt) {
      inTransit.set(t.sentCurrency, (inTransit.get(t.sentCurrency) ?? 0) + t.sentAmountCents)
    } else if (t.toCardId) {
      addDebt(t.toCardId, t.receivedCurrency, -t.receivedAmountCents, -(t.costBasisCents ?? 0))
    } else {
      addBalance(
        t.toProductId ? { type: 'product', id: t.toProductId } : { type: 'cash_wallet', id: t.toCashWalletId! },
        t.receivedAmountCents,
      )
    }
  }

  for (const a of ledger.adjustments) {
    const ref = balanceRef(a)
    if (ref) addBalance(ref, a.deltaCents)
    else addDebt(a.cardId!, a.currency, a.deltaCents, 0)
  }

  return {
    accounts: [
      ...ledger.products.map((p) => ({
        ref: { type: 'product' as const, id: p.id },
        name: p.name,
        bankName: p.bankName,
        currency: p.currency,
      })),
      ...ledger.cashWallets.map((w) => ({
        ref: { type: 'cash_wallet' as const, id: w.id },
        name: w.name,
        bankName: null,
        currency: w.currency,
      })),
    ].map((account) => ({ ...account, balanceCents: balance.get(sourceKey(account.ref)) ?? 0 })),

    creditCards: ledger.cards
      .filter((c) => c.kind === 'credit')
      .map((c) => {
        const perCurrency = debt.get(c.id) ?? new Map<string, { units: number; basis: number }>()
        const debts: CardDebt[] = [...perCurrency]
          .filter(([, entry]) => entry.units !== 0)
          .map(([currency, entry]) => ({
            currency,
            amountCents: entry.units,
            costBasisCents: currency === c.currency ? null : entry.basis,
          }))
        const totalCents = debts.reduce((sum, d) => sum + (d.costBasisCents ?? d.amountCents), 0)
        return {
          ref: { type: 'card' as const, id: c.id },
          name: c.name,
          currency: c.currency,
          creditLimitCents: c.creditLimitCents,
          debts,
          totalCents,
          availableCents: c.creditLimitCents === null ? null : c.creditLimitCents - totalCents,
        }
      }),

    inTransit: [...inTransit].map(([currency, amountCents]) => ({ currency, amountCents })),
  }
}

/** Outstanding units and cost basis of one currency of a card's debt (zero when there is none). */
export function cardDebtOf(balances: Balances, cardId: string, currency: string) {
  const debtEntry = balances.creditCards.find((c) => c.ref.id === cardId)?.debts.find((d) => d.currency === currency)
  return { units: debtEntry?.amountCents ?? 0, basis: debtEntry?.costBasisCents ?? debtEntry?.amountCents ?? 0 }
}

/** Current balance of a product or cash wallet, or the debt of a card in one currency. */
export function currentBalanceOf(balances: Balances, ref: SourceRef, currency: string) {
  if (ref.type === 'card') return cardDebtOf(balances, ref.id, currency).units
  return balances.accounts.find((a) => sourceKey(a.ref) === sourceKey(ref))?.balanceCents ?? 0
}
