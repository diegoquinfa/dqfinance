import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import type * as React from 'react'
import { m } from '#/shared/i18n'
import { formatMoney, formatNumber } from '#/shared/money'
import { Button } from '#/shared/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/shared/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { useBalances } from '../balances/balances-api'
import { AddCashWalletDialog, TypeBadge, cardKinds, productTypes } from './add-dialogs'
import { useAccounts } from './accounts-api'
import { brandLabel } from './card-face'
import { bpsToPercent } from './rates'
import { sourceKey, type SourceRef } from './sources'

const typeLabel = (type: string) => productTypes.find((item) => item.value === type)?.label() ?? type
const kindLabel = (kind: string) => cardKinds.find((item) => item.value === kind)?.label() ?? kind

/** Every create action is a link to its page, on every screen size; the arrow says it navigates. */
function CreateLink({
  to,
  search,
  label,
}: {
  to: '/accounts/new' | '/accounts/new-card'
  search?: { bankId?: string; bankAccountId?: string; productId?: string }
  label: string
}) {
  return (
    <Button variant="link" asChild>
      <Link to={to} search={search}>
        {label}
        <span aria-hidden>→</span>
      </Link>
    </Button>
  )
}

// Full width on mobile so the actions wrap below; beside them from sm up.
const lineClass = 'flex min-w-0 basis-full items-baseline justify-between gap-4 sm:basis-0 sm:flex-1'

/** A row that opens the source's detail page; the actions beside it stay outside the link. */
function SourceLine({
  to,
  name,
  badges,
  amount,
  sub,
  actions,
  nested = false,
}: {
  to?: SourceRef
  name: React.ReactNode
  badges: React.ReactNode
  amount?: string
  /** A mono line under the amount, like the total a product holds with its pockets. */
  sub?: string
  actions?: React.ReactNode
  nested?: boolean
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-ink transition-transform duration-500 group-hover:translate-x-1">
          {nested && (
            <span aria-hidden className="mr-2 text-faint">
              ↳
            </span>
          )}
          {name}
        </span>
        {badges}
      </span>
      {amount && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-medium text-ink tabular-nums">{amount}</span>
          {sub && <span className="label-mono text-muted-foreground tabular-nums">{sub}</span>}
        </div>
      )}
    </>
  )
  return (
    <li className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4 ${nested ? 'pl-5' : ''}`}>
      {to ? (
        <Link to="/accounts/$type/$id" params={to} className={`group ${lineClass}`}>
          {body}
        </Link>
      ) : (
        <div className={lineClass}>{body}</div>
      )}
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </li>
  )
}

export function AccountsPage() {
  const accounts = useAccounts()
  const balances = useBalances()

  if (accounts.isPending || balances.isPending) return <ListSkeleton rows={5} />
  if (accounts.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {accounts.error.message}
      </p>
    )
  }

  const tree = accounts.data
  const balanceOf = (ref: SourceRef) =>
    balances.data?.accounts.find((account) => sourceKey(account.ref) === sourceKey(ref))?.balance ?? 0
  const cardDebt = (id: string) => balances.data?.creditCards.find((card) => card.ref.id === id)
  const index = (position: number) => String(position + 1).padStart(2, '0')

  return (
    <>
      <PageHeader
        title={m.accounts_title()}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/accounts/new">{m.accounts_new_title()}</Link>
            </Button>
            <AddCashWalletDialog />
          </>
        }
      />

      {tree.banks.length === 0 && tree.cashWallets.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.accounts_empty()}</EmptyTitle>
            <EmptyDescription>{m.accounts_empty_description()}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link to="/accounts/new">{m.accounts_create_first()}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {tree.banks.map((bank, position) => (
        <Section
          key={bank.id}
          index={index(position)}
          label={bank.name}
          action={<CreateLink to="/accounts/new" search={{ bankId: bank.id }} label={m.accounts_add_bank_account()} />}
        >
          {bank.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{m.accounts_bank_no_accounts()}</p>
          ) : (
            // The bank account stays in the model but not on screen: its products sit right under the bank.
            <ul className={rowsClass}>
              {bank.accounts.flatMap((account) => {
                const last4 = account.last4 && (
                  <span className="label-mono whitespace-nowrap text-muted-foreground">•••• {account.last4}</span>
                )
                if (account.products.length === 0) {
                  return [
                    <SourceLine
                      key={account.id}
                      name={account.name}
                      badges={
                        <>
                          {last4}
                          <span className="label-mono text-muted-foreground">{m.accounts_no_products()}</span>
                        </>
                      }
                      actions={
                        <CreateLink
                          to="/accounts/new"
                          search={{ bankAccountId: account.id }}
                          label={m.accounts_add_product()}
                        />
                      }
                    />,
                  ]
                }
                return account.products.flatMap((product) => {
                  const ref: SourceRef = { type: 'product', id: product.id }
                  const pockets = product.pockets
                  // What the person really holds there: the product and the money set aside inside it.
                  const total =
                    balanceOf(ref) +
                    pockets.reduce((sum, pocket) => sum + balanceOf({ type: 'product', id: pocket.id }), 0)
                  return [
                    <SourceLine
                      key={product.id}
                      to={ref}
                      name={product.name}
                      badges={
                        <>
                          <TypeBadge>{typeLabel(product.type)}</TypeBadge>
                          <TypeBadge>{product.currency}</TypeBadge>
                          {last4}
                        </>
                      }
                      amount={formatMoney(balanceOf(ref), product.currency)}
                      sub={
                        pockets.length
                          ? `${m.accounts_total_with_pockets()} ${formatMoney(total, product.currency)}`
                          : undefined
                      }
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="link">
                              {m.accounts_add_menu()}
                              <ChevronDown aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to="/accounts/new-card" search={{ productId: product.id }}>
                                {m.accounts_add_card()}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/accounts/new-pocket" search={{ productId: product.id }}>
                                {m.accounts_add_pocket()}
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />,
                    // A pocket hangs under the product it sets money aside from (design D14).
                    ...pockets.map((pocket) => {
                      const pocketRef: SourceRef = { type: 'product', id: pocket.id }
                      return (
                        <SourceLine
                          key={pocket.id}
                          nested
                          to={pocketRef}
                          name={pocket.name}
                          badges={
                            <>
                              <TypeBadge>{m.product_pocket()}</TypeBadge>
                              <TypeBadge>{pocket.currency}</TypeBadge>
                              {pocket.annualRateBps !== null && (
                                <span className="label-mono text-muted-foreground">
                                  {formatNumber(bpsToPercent(pocket.annualRateBps))}% E.A.
                                  {pocket.yieldPayout && (
                                    <>
                                      {' · '}
                                      {pocket.yieldPayout === 'daily' ? m.yield_payout_daily() : m.yield_payout_monthly()}
                                    </>
                                  )}
                                </span>
                              )}
                            </>
                          }
                          amount={formatMoney(balanceOf(pocketRef), pocket.currency)}
                        />
                      )
                    }),
                    ...product.cards.map((card) => {
                      const debt = cardDebt(card.id)
                      const credit = card.kind === 'credit'
                      return (
                        <SourceLine
                          key={card.id}
                          nested
                          to={credit ? { type: 'card', id: card.id } : undefined}
                          name={
                            <>
                              {card.name}
                              {card.last4 && (
                                <span className="label-mono ml-3 whitespace-nowrap text-muted-foreground">
                                  •••• {card.last4}
                                </span>
                              )}
                            </>
                          }
                          badges={
                            <>
                              <TypeBadge>{kindLabel(card.kind)}</TypeBadge>
                              {card.brand && <TypeBadge>{brandLabel(card.brand)}</TypeBadge>}
                              <span className="label-mono text-muted-foreground">
                                {credit
                                  ? card.creditLimit !== null &&
                                    m.accounts_card_limit({ amount: formatMoney(card.creditLimit, product.currency) })
                                  : m.accounts_spends_from({ product: product.name })}
                              </span>
                            </>
                          }
                          amount={
                            credit
                              ? m.accounts_card_total({ amount: formatMoney(debt?.total ?? 0, product.currency) })
                              : undefined
                          }
                        />
                      )
                    }),
                  ]
                })
              })}
            </ul>
          )}
        </Section>
      ))}

      {tree.cashWallets.length > 0 && (
        <Section index={index(tree.banks.length)} label={m.label_cash()}>
          <ul className={rowsClass}>
            {tree.cashWallets.map((wallet) => {
              const ref: SourceRef = { type: 'cash_wallet', id: wallet.id }
              return (
                <SourceLine
                  key={wallet.id}
                  to={ref}
                  name={wallet.name}
                  badges={<TypeBadge>{wallet.currency}</TypeBadge>}
                  amount={formatMoney(balanceOf(ref), wallet.currency)}
                />
              )
            })}
          </ul>
        </Section>
      )}
    </>
  )
}
