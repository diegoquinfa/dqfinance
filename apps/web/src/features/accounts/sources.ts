import { useMemo } from 'react'
import { m } from '#/shared/i18n'
import { useBalances } from '../balances/balances-api'
import { useAccounts } from './accounts-api'

export type SourceRef = { type: 'product' | 'cash_wallet' | 'card'; id: string }

export const sourceKey = (ref: SourceRef) => `${ref.type}:${ref.id}`

export type SourceOption = {
  key: string
  ref: SourceRef
  label: string
  /** Optgroup label: the bank, or "Cash". */
  group: string
  currency: string
  cardKind: 'debit' | 'credit' | null
  balance: number | null
  debt: number | null
}

/** Every source the user can move money with, with its balance or debt. */
export function useSources() {
  const accounts = useAccounts()
  const balances = useBalances()

  const sources = useMemo<SourceOption[]>(() => {
    const tree = accounts.data
    if (!tree) return []
    const balanceByKey = new Map(balances.data?.accounts.map((a) => [sourceKey(a.ref), a.balance]) ?? [])
    const debtByKey = new Map(balances.data?.creditCards.map((c) => [sourceKey(c.ref), c.total]) ?? [])
    const options: SourceOption[] = []

    for (const bank of tree.banks) {
      for (const account of bank.accounts) {
        for (const product of account.products) {
          const ref: SourceRef = { type: 'product', id: product.id }
          options.push({
            key: sourceKey(ref),
            ref,
            label: product.name,
            group: bank.name,
            currency: product.currency,
            cardKind: null,
            balance: balanceByKey.get(sourceKey(ref)) ?? 0,
            debt: null,
          })
          // A pocket is a source like its parent: money can move in and out of it (design D14).
          for (const pocket of product.pockets) {
            const pocketRef: SourceRef = { type: 'product', id: pocket.id }
            options.push({
              key: sourceKey(pocketRef),
              ref: pocketRef,
              label: pocket.name,
              group: bank.name,
              currency: pocket.currency,
              cardKind: null,
              balance: balanceByKey.get(sourceKey(pocketRef)) ?? 0,
              debt: null,
            })
          }
          for (const card of product.cards) {
            const cardRef: SourceRef = { type: 'card', id: card.id }
            options.push({
              key: sourceKey(cardRef),
              ref: cardRef,
              label: `${card.name} · ${card.kind === 'credit' ? m.card_credit() : m.card_debit()}`,
              group: bank.name,
              currency: product.currency,
              cardKind: card.kind,
              balance: null,
              debt: debtByKey.get(sourceKey(cardRef)) ?? 0,
            })
          }
        }
      }
    }
    for (const wallet of tree.cashWallets) {
      const ref: SourceRef = { type: 'cash_wallet', id: wallet.id }
      options.push({
        key: sourceKey(ref),
        ref,
        label: wallet.name,
        group: m.label_cash(),
        currency: wallet.currency,
        cardKind: null,
        balance: balanceByKey.get(sourceKey(ref)) ?? 0,
        debt: null,
      })
    }
    return options
  }, [accounts.data, balances.data])

  return { sources, isPending: accounts.isPending || balances.isPending, error: accounts.error ?? balances.error }
}

export const findSource = (sources: SourceOption[], key: string) => sources.find((source) => source.key === key)

/** Products and cash wallets only: a transfer origin can never be a card. */
export const cashAndProducts = (sources: SourceOption[]) => sources.filter((s) => s.ref.type !== 'card')

/** Products, cash wallets, and credit cards: destinations for a transfer. */
export const transferDestinations = (sources: SourceOption[]) =>
  sources.filter((s) => s.ref.type !== 'card' || s.cardKind === 'credit')
