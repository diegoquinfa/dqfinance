import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useRecurringExpenses, useSkipRecurring, useConfirmRecurring } from '#/features/recurring-expenses/recurring-expenses-api'
import { useSettings } from '#/features/settings/settings-api'
import { SafeToSpendCard } from '#/features/spending/safe-to-spend-card'
import { ForecastChart } from '#/features/spending/forecast-chart'
import { TransactionRow } from '#/features/transactions/transaction-row'
import { useTransactions } from '#/features/transactions/transactions-api'
import { formatDay } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Eyebrow, Section, rowsClass } from '#/shared/ui/page'
import { Separator } from '#/shared/ui/separator'
import { Skeleton } from '#/shared/ui/skeleton'
import { BalanceChart } from './balance-chart'
import { useBalances } from './balances-api'
import { CalendarPeriod } from './period-totals'
import { netWorth } from './totals'

/** "Ver todo →" beside a section label. */
export function ViewAll({
  to,
  search,
}: {
  to: '/accounts' | '/transactions' | '/recurring'
  search?: { source?: string }
}) {
  return (
    <Link to={to} search={search} className="label-mono group text-ink">
      <span className="link-draw">{m.action_view_all()}</span>
      <span aria-hidden className="ml-2 inline-block transition-transform duration-500 group-hover:translate-x-1">
        →
      </span>
    </Link>
  )
}

/** A row that opens a source: name and context on the left, the number on the right. */
export function SourceRow({
  to,
  name,
  meta,
  amount,
  detail,
}: {
  to: { type: 'product' | 'cash_wallet' | 'card'; id: string }
  name: string
  meta?: string | null
  amount: string
  detail?: React.ReactNode
}) {
  return (
    <li>
      <Link
        to="/accounts/$type/$id"
        params={to}
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4"
      >
        <span className="truncate text-ink transition-transform duration-500 group-hover:translate-x-1 sm:type-heading-sm">
          {name}
        </span>
        <span className="font-medium text-ink tabular-nums sm:type-heading-sm">{amount}</span>
        <span className="label-mono truncate text-muted-foreground">{meta}</span>
        <span className="label-mono text-right text-muted-foreground">
          {detail ?? (
            <span aria-hidden className="inline-block text-faint transition-[transform,color] duration-500 group-hover:translate-x-1 group-hover:text-signal">
              →
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

export function OverviewPage() {
  const balances = useBalances()
  const settings = useSettings()
  const pending = useRecurringExpenses(true)
  const recent = useTransactions({ limit: 8 })
  const confirm = useConfirmRecurring()
  const skip = useSkipRecurring()

  if (balances.isPending || settings.isPending) {
    return (
      <div className="grid gap-10 py-10" aria-busy="true">
        <Skeleton className="h-16 w-2/3 md:h-20" />
        <ListSkeleton rows={5} />
      </div>
    )
  }
  if (balances.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {balances.error.message}
      </p>
    )
  }

  const { accounts, creditCards, inTransit } = balances.data
  const primary = settings.data?.primaryCurrency ?? accounts[0]?.currency ?? 'USD'
  // A card's debt counts in the card's currency, like its statement (foreign charges at cost).
  const worth = netWorth(
    accounts,
    creditCards.map((card) => ({ currency: card.currency, amount: card.total })),
    primary,
  )
  const otherBalances = worth.slice(1).filter((entry) => entry.assets !== 0)
  const pendingItems = pending.data ?? []
  // The section only counts while something is due (or still loading), so the numbers follow the visible order.
  const showPending = pending.isPending || pendingItems.length > 0
  const sectionKeys = [
    showPending ? 'pending' : null,
    'month',
    'worth',
    'accounts',
    'recent',
  ].filter((key): key is string => key !== null)
  const sectionIndex = (key: string) => String(sectionKeys.indexOf(key) + 2).padStart(2, '0')

  return (
    <>
      <h1 className="sr-only">{m.overview_title()}</h1>

      {/* Summary band: the total and the period controls, with anything still in transit under the total.
          A container query, not a viewport one: the desktop rail narrows the content without moving `lg`. */}
      <div className="@container">
        <section className="grid gap-10 pt-10 pb-8 md:pt-16 @[64rem]:grid-cols-12 @[64rem]:items-start @[64rem]:gap-x-12 lg:pb-12">
          <div className="grid content-start min-w-0 gap-3 @[64rem]:col-span-6">
            <h2>
              <Eyebrow index="01">{m.overview_total_balance()}</Eyebrow>
            </h2>
            <p className="type-display font-medium break-words text-ink tabular-nums">
              {formatMoney(worth[0]!.assets, primary)}
            </p>
            {otherBalances.length > 0 && (
              <ul aria-label={m.overview_other_currencies()} className="flex flex-wrap gap-x-6 gap-y-1">
                {otherBalances.map((entry) => (
                  <li key={entry.currency} className="label-mono text-muted-foreground tabular-nums">
                    {formatMoney(entry.assets, entry.currency)}
                  </li>
                ))}
              </ul>
            )}
            {inTransit.length > 0 && (
              <div className="grid gap-3">
                <h3>
                  <Eyebrow>{m.overview_in_transit()}</Eyebrow>
                </h3>
                <ul aria-label={m.overview_in_transit()} className="flex flex-wrap gap-x-6 gap-y-1">
                  {inTransit.map((transfer) => (
                    <li key={transfer.currency} className="label-mono text-muted-foreground tabular-nums">
                      {formatMoney(transfer.amount, transfer.currency)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="min-w-0 @[64rem]:col-span-6">
            <CalendarPeriod currency={primary} showNet />
          </div>
        </section>
      </div>

      {showPending && (
        <Section index={sectionIndex('pending')} label={m.overview_pending()} action={<ViewAll to="/recurring" />}>
          {pending.isPending ? (
            <ListSkeleton rows={2} />
          ) : (
            <ul className={rowsClass}>
              {pendingItems.map((item) => (
                <li key={item.id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{item.name}</p>
                    <p className="label-mono text-muted-foreground">{formatDay(item.nextDueOn)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`pending-amount-${item.id}`} className="sr-only">
                      {m.label_amount()} ({item.currency})
                    </label>
                    <Input
                      id={`pending-amount-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      defaultValue={item.amount}
                      className="w-36 tabular-nums"
                    />
                    <Button
                      variant="outline"
                      disabled={confirm.isPending}
                      onClick={() => {
                        const input = document.getElementById(`pending-amount-${item.id}`) as HTMLInputElement | null
                        confirm.mutate({ id: item.id, amount: input ? Number(input.value) : item.amount })
                      }}
                    >
                      {m.action_confirm()}
                    </Button>
                    <Button variant="ghost" disabled={skip.isPending} onClick={() => skip.mutate(item.id)}>
                      {m.action_skip()}
                    </Button>
                  </div>
                  {(confirm.error || skip.error) && (
                    <p role="alert" className="text-sm text-destructive sm:col-span-2">
                      {confirm.error?.message ?? skip.error?.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section index={sectionIndex('month')} label={m.overview_month()}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="min-w-0 lg:col-span-7">
            <p className="mb-6 max-w-prose text-sm text-muted-foreground">{m.forecast_hint()}</p>
            <ForecastChart />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <SafeToSpendCard />
          </div>
        </div>
      </Section>

      <Section index={sectionIndex('worth')} label={m.overview_net_worth()}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <ul className="grid content-start min-w-0 gap-8 lg:col-span-5">
            {worth.map((entry) => (
              <li key={entry.currency} className="grid gap-4">
                <p className="type-heading font-medium text-ink tabular-nums">{formatMoney(entry.net, entry.currency)}</p>
                <div className="grid gap-4">
                  <Separator />
                  <dl className="grid grid-cols-2 gap-y-4">
                    <div>
                      <dt className="label-mono text-muted-foreground">{m.overview_assets()}</dt>
                      <dd className="mt-1 text-soft tabular-nums">{formatMoney(entry.assets, entry.currency)}</dd>
                    </div>
                    <div>
                      <dt className="label-mono text-muted-foreground">{m.overview_liabilities()}</dt>
                      <dd className="mt-1 text-soft tabular-nums">{formatMoney(entry.liabilities, entry.currency)}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
          <BalanceChart className="lg:col-span-7" currency={primary} />
        </div>
      </Section>

      <Section index={sectionIndex('accounts')} label={m.overview_accounts_cards()} action={<ViewAll to="/accounts" />}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="grid content-start min-w-0 gap-5 lg:col-span-7">
            <h3>
              <Eyebrow>{m.overview_accounts()}</Eyebrow>
            </h3>
            {accounts.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{m.accounts_empty()}</EmptyTitle>
                  <EmptyDescription>{m.overview_no_accounts()}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className={rowsClass}>
                {accounts.map((account) => (
                  <SourceRow
                    key={`${account.ref.type}:${account.ref.id}`}
                    to={account.ref}
                    name={account.name}
                    meta={account.bankName ?? m.label_cash()}
                    amount={formatMoney(account.balance, account.currency)}
                  />
                ))}
              </ul>
            )}
          </div>
          <div className="grid content-start min-w-0 gap-5 lg:col-span-5">
            <h3>
              <Eyebrow>{m.overview_cards()}</Eyebrow>
            </h3>
            {creditCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">{m.overview_no_cards()}</p>
            ) : (
              <ul className={rowsClass}>
                {creditCards.map((card) => (
                  <SourceRow
                    key={card.ref.id}
                    to={card.ref}
                    name={card.name}
                    meta={card.debts
                      .filter((debt) => debt.currency !== card.currency)
                      .map((debt) => formatMoney(debt.amount, debt.currency))
                      .join(' + ')}
                    amount={formatMoney(card.total, card.currency)}
                    detail={
                      card.available !== null &&
                      m.accounts_card_available({ amount: formatMoney(card.available, card.currency) })
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section index={sectionIndex('recent')} label={m.overview_recent()} action={<ViewAll to="/transactions" />}>
        {recent.isPending ? (
          <ListSkeleton rows={4} />
        ) : (recent.data ?? []).length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.transactions_empty()}</EmptyTitle>
              <EmptyDescription>{m.transactions_empty_description()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className={rowsClass}>
            {(recent.data ?? []).map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
