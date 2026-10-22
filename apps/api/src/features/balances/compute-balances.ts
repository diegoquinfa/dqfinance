import type { SourceRef } from '../accounts/source'

const sourceKey = (ref: SourceRef) => `${ref.type}:${ref.id}`

/**
 * Pure core of the Balances module: applies the balance rules of design D1 to every movement row.
 * All amounts are integer cents.
 */
export type Ledger = {
  products: {
    id: string
    name: string
    bankName: string
    currency: string
    annualRateBps: number | null
    /** How often the interest is paid; null for cash wallets and products without a choice. */
    yieldPayout: 'daily' | 'monthly' | null
  }[]
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
    occurredAt: Date
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
    sentAt: Date
    receivedAt: Date | null
  }[]
  adjustments: {
    productId: string | null
    cashWalletId: string | null
    cardId: string | null
    currency: string
    deltaCents: number
    adjustedAt: Date
  }[]
}

/** A ledger as it stood at `at`: every movement dated after it is dropped. */
export type LedgerPoint = { at: Date } & Ledger

export type CardDebt = {
  currency: string
  amountCents: number
  /** Purchase-day value in the card's currency; only for foreign currencies. */
  costBasisCents: number | null
}

export type Balances = {
  accounts: {
    ref: SourceRef
    name: string
    bankName: string | null
    currency: string
    balanceCents: number
    /** Effective annual rate of a product; null for cash wallets and products without one. */
    annualRateBps: number | null
    /** How often the interest is paid; null for cash wallets and products without a choice. */
    yieldPayout: 'daily' | 'monthly' | null
  }[]
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

  // One walk in date order. An adjustment must be valued at the rate of the debt outstanding at its
  // own instant, so a later movement never re-values it. A transfer counts at each of its two dates;
  // a charge dated exactly at the adjustment's instant counts for it, like the old loop order.
  type Movement =
    | { at: number; rank: 0; kind: 'transaction'; row: Ledger['transactions'][number] }
    | { at: number; rank: 0; kind: 'transferSent'; row: Ledger['transfers'][number] }
    | { at: number; rank: 0; kind: 'transferReceived'; row: Ledger['transfers'][number] }
    | { at: number; rank: 1; kind: 'adjustment'; row: Ledger['adjustments'][number] }
  const movements: Movement[] = [
    ...ledger.transactions.map((row): Movement => ({ at: row.occurredAt.getTime(), rank: 0, kind: 'transaction', row })),
    ...ledger.transfers.map((row): Movement => ({ at: row.sentAt.getTime(), rank: 0, kind: 'transferSent', row })),
    ...ledger.transfers.flatMap((row): Movement[] =>
      row.receivedAt ? [{ at: row.receivedAt.getTime(), rank: 0, kind: 'transferReceived', row }] : [],
    ),
    ...ledger.adjustments.map((row): Movement => ({ at: row.adjustedAt.getTime(), rank: 1, kind: 'adjustment', row })),
  ].sort((a, b) => a.at - b.at || a.rank - b.rank)

  for (const movement of movements) {
    switch (movement.kind) {
      case 'transaction': {
        const t = movement.row
        const sign = t.type === 'income' ? 1 : -1
        const ref = balanceRef(t)
        if (ref) {
          addBalance(ref, sign * t.amountCents)
          break
        }
        const owner = cards.get(t.cardId!)
        if (!owner) break
        const foreign = t.currency !== owner.currency
        addDebt(owner.id, t.currency, -sign * t.amountCents, foreign ? -sign * (t.primaryAmountCents ?? 0) : 0)
        break
      }
      case 'transferSent': {
        const t = movement.row
        const from: SourceRef = t.fromProductId
          ? { type: 'product', id: t.fromProductId }
          : { type: 'cash_wallet', id: t.fromCashWalletId! }
        addBalance(from, -t.sentAmountCents)
        if (!t.receivedAt) inTransit.set(t.sentCurrency, (inTransit.get(t.sentCurrency) ?? 0) + t.sentAmountCents)
        break
      }
      case 'transferReceived': {
        const t = movement.row
        if (t.toCardId) addDebt(t.toCardId, t.receivedCurrency, -t.receivedAmountCents, -(t.costBasisCents ?? 0))
        else
          addBalance(
            t.toProductId ? { type: 'product', id: t.toProductId } : { type: 'cash_wallet', id: t.toCashWalletId! },
            t.receivedAmountCents,
          )
        break
      }
      case 'adjustment': {
        const a = movement.row
        const ref = balanceRef(a)
        if (ref) {
          addBalance(ref, a.deltaCents)
          break
        }
        const owner = cards.get(a.cardId!)
        const entry = debt.get(a.cardId!)?.get(a.currency)
        // Foreign debt is valued at the average cost of the debt outstanding at this instant; with no
        // debt in that currency there is no rate, so the units stay in their own currency and out of the
        // card total. The running total already holds every earlier adjustment.
        const rate = owner && a.currency !== owner.currency && entry && entry.units !== 0 ? entry.basis / entry.units : 0
        addDebt(a.cardId!, a.currency, a.deltaCents, Math.round(a.deltaCents * rate))
        break
      }
    }
  }

  return {
    accounts: [
      ...ledger.products.map((p) => ({
        ref: { type: 'product' as const, id: p.id },
        name: p.name,
        bankName: p.bankName,
        currency: p.currency,
        annualRateBps: p.annualRateBps,
        yieldPayout: p.yieldPayout,
      })),
      ...ledger.cashWallets.map((w) => ({
        ref: { type: 'cash_wallet' as const, id: w.id },
        name: w.name,
        bankName: null,
        currency: w.currency,
        annualRateBps: null,
        yieldPayout: null,
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

/**
 * The same ledger seen from `at`: movements after that instant are dropped, then the same rules run.
 * A movement counts from its own date, so nothing is rounded to a month here (design D1).
 */
export function computeBalancesAt(ledger: LedgerPoint): Balances {
  const before = ledger.at.getTime()
  const onTime = (date: Date | null) => date !== null && date.getTime() <= before
  return computeBalances({
    ...ledger,
    transactions: ledger.transactions.filter((t) => onTime(t.occurredAt)),
    // Sent and received are two dates: money in transit has left the origin but not reached the destination.
    transfers: ledger.transfers
      .filter((t) => onTime(t.sentAt))
      .map((t) => ({ ...t, receivedAt: onTime(t.receivedAt) ? t.receivedAt : null })),
    adjustments: ledger.adjustments.filter((a) => onTime(a.adjustedAt)),
  })
}

/**
 * The last instant of each of the last `months` calendar months (UTC), oldest first, with `now` for
 * the current one: the current month has no end yet.
 */
export function monthEnds(months: number, now: Date): Date[] {
  const ends: Date[] = []
  for (let back = months - 1; back >= 0; back--) {
    ends.push(back === 0 ? now : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back + 1, 1) - 1))
  }
  return ends
}

/** Assets (product and cash balances) and liabilities (card debt) per currency, like the overview. */
export function assetsAndLiabilities(balances: Balances) {
  const totals = new Map<string, { assetsCents: number; liabilitiesCents: number }>()
  const entry = (currency: string) =>
    totals.get(currency) ?? totals.set(currency, { assetsCents: 0, liabilitiesCents: 0 }).get(currency)!
  for (const account of balances.accounts) entry(account.currency).assetsCents += account.balanceCents
  // A card's debt counts in the card's currency, like its statement (foreign charges at purchase-day cost).
  for (const card of balances.creditCards) entry(card.currency).liabilitiesCents += card.totalCents
  return [...totals].map(([currency, total]) => ({ currency, ...total }))
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
