import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { EmptyState, ListSkeleton } from '#/shared/ui/field'
import { useBalances } from '../balances/balances-api'
import {
  AddBankAccountDialog,
  AddBankDialog,
  AddCardDialog,
  AddCashWalletDialog,
  AddProductDialog,
  TypeBadge,
  cardKinds,
  productTypes,
} from './add-dialogs'
import { AdjustBalanceDialog } from './adjust-balance-dialog'
import { useAccounts } from './accounts-api'
import { sourceKey, type SourceRef } from './sources'

const typeLabel = (type: string) => productTypes.find((item) => item.value === type)?.label() ?? type
const kindLabel = (kind: string) => cardKinds.find((item) => item.value === kind)?.label() ?? kind

export function AccountsPage() {
  const accounts = useAccounts()
  const balances = useBalances()

  if (accounts.isPending || balances.isPending) return <ListSkeleton rows={5} />
  if (accounts.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {accounts.error.message}
      </p>
    )
  }

  const tree = accounts.data
  const balanceOf = (ref: SourceRef) =>
    balances.data?.accounts.find((account) => sourceKey(account.ref) === sourceKey(ref))?.balance ?? 0
  const cardDebt = (id: string) => balances.data?.creditCards.find((card) => card.ref.id === id)
  const cardCurrencies = (id: string, cardCurrency: string) => {
    const debts = cardDebt(id)?.debts.map((debt) => debt.currency) ?? []
    return [...new Set([cardCurrency, ...debts])]
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{m.accounts_title()}</h1>
        <div className="flex gap-2">
          <AddBankDialog />
          <AddCashWalletDialog />
        </div>
      </div>

      {tree.banks.length === 0 && tree.cashWallets.length === 0 && (
        <EmptyState title={m.accounts_empty()} description={m.accounts_empty_description()} />
      )}

      {tree.banks.map((bank) => (
        <section key={bank.id} className="grid gap-4">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <h2 className="font-semibold">{bank.name}</h2>
            <AddBankAccountDialog bankId={bank.id} bankName={bank.name} />
          </div>

          {bank.accounts.map((account) => (
            <div key={account.id} className="grid gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">
                  {account.name}
                  {account.last4 && <span className="ml-2 text-sm text-muted-foreground">•••• {account.last4}</span>}
                </h3>
                <AddProductDialog bankAccountId={account.id} accountName={account.name} />
              </div>

              {account.products.map((product) => {
                const ref: SourceRef = { type: 'product', id: product.id }
                return (
                  <div key={product.id} className="grid gap-3 rounded-md bg-muted/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        <TypeBadge>{typeLabel(product.type)}</TypeBadge>
                        <TypeBadge>{product.currency}</TypeBadge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums">{formatMoney(balanceOf(ref), product.currency)}</span>
                        <AdjustBalanceDialog
                          ref={ref}
                          name={product.name}
                          currency={product.currency}
                          currentBalance={balanceOf(ref)}
                        />
                        <AddCardDialog productId={product.id} productName={product.name} />
                      </div>
                    </div>

                    {product.cards.length > 0 && (
                      <ul className="grid gap-2 border-t pt-2">
                        {product.cards.map((card) => {
                          const cardRef: SourceRef = { type: 'card', id: card.id }
                          const debt = cardDebt(card.id)
                          return (
                            <li key={card.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>
                                  {card.name}
                                  {card.last4 && <span className="ml-2 text-muted-foreground">•••• {card.last4}</span>}
                                </span>
                                <TypeBadge>{kindLabel(card.kind)}</TypeBadge>
                                {card.creditLimit !== null && (
                                  <span className="text-muted-foreground">
                                    {m.accounts_card_limit({ amount: formatMoney(card.creditLimit, product.currency) })}
                                  </span>
                                )}
                              </div>
                              {card.kind === 'credit' ? (
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="tabular-nums">
                                    {m.accounts_card_total({ amount: formatMoney(debt?.total ?? 0, product.currency) })}
                                  </span>
                                  {debt?.available !== null && debt !== undefined && (
                                    <span className="text-muted-foreground tabular-nums">
                                      {m.accounts_card_available({
                                        amount: formatMoney(debt.available ?? 0, product.currency),
                                      })}
                                    </span>
                                  )}
                                  <AdjustBalanceDialog
                                    ref={cardRef}
                                    name={card.name}
                                    currency={product.currency}
                                    currentBalance={
                                      debt?.debts.find((entry) => entry.currency === product.currency)?.amount ?? 0
                                    }
                                    debtCurrencies={cardCurrencies(card.id, product.currency)}
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  {m.accounts_spends_from({ product: product.name })}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </section>
      ))}

      {tree.cashWallets.length > 0 && (
        <section className="grid gap-3">
          <h2 className="border-b pb-2 font-semibold">{m.label_cash()}</h2>
          <ul className="grid gap-3">
            {tree.cashWallets.map((wallet) => {
              const ref: SourceRef = { type: 'cash_wallet', id: wallet.id }
              return (
                <li key={wallet.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{wallet.name}</span>
                    <TypeBadge>{wallet.currency}</TypeBadge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">{formatMoney(balanceOf(ref), wallet.currency)}</span>
                    <AdjustBalanceDialog
                      ref={ref}
                      name={wallet.name}
                      currency={wallet.currency}
                      currentBalance={balanceOf(ref)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
