import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccounts, findCard, findProduct } from '#/features/accounts/accounts-api'
import { AdjustBalanceDialog } from '#/features/accounts/adjust-balance-dialog'
import { CardFace } from '#/features/accounts/card-face'
import { EditCardDialog, EditProductDialog } from '#/features/accounts/edit-dialogs'
import { bpsToPercent } from '#/features/accounts/rates'
import { sourceKey, type SourceRef } from '#/features/accounts/sources'
import { SourceCosts } from '#/features/recurring-expenses/recurring-page'
import { TransactionRow } from '#/features/transactions/transaction-row'
import { useTransactions } from '#/features/transactions/transactions-api'
import { m } from '#/shared/i18n'
import { formatMoney, formatNumber } from '#/shared/money'
import { lastMonths } from '#/shared/periods'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Eyebrow, Section, rowsClass } from '#/shared/ui/page'
import { Skeleton } from '#/shared/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { BalanceChart } from './balance-chart'
import { useBalances } from './balances-api'
import { ViewAll } from './overview-page'
import { PeriodTotals } from './period-totals'

function BackToAccounts() {
  return (
    <Link to="/accounts" className="label-mono group inline-flex gap-2 text-muted-foreground hover:text-ink">
      <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1">
        ←
      </span>
      {m.nav_accounts()}
    </Link>
  )
}

/** One account, cash wallet or credit card: its balance, its income and expenses, its movements. */
export function SourcePage({ type, id }: SourceRef) {
  const balances = useBalances()
  const accounts = useAccounts()
  const [months, setMonths] = useState<'6' | '12'>('6')
  const recent = useTransactions({ limit: 20, sourceType: type, sourceId: id })

  if (balances.isPending) {
    return (
      <div className="grid gap-6 py-10" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-1/2 md:h-20" />
        <ListSkeleton rows={4} />
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

  const account = balances.data.accounts.find((item) => item.ref.type === type && item.ref.id === id)
  const card = type === 'card' ? balances.data.creditCards.find((item) => item.ref.id === id) : undefined
  const source = account ?? card
  if (!source) {
    return (
      <div className="grid gap-6 py-10">
        <BackToAccounts />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.source_not_found()}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const ref: SourceRef = { type, id }
  const amount = account ? account.balance : card!.total
  const cardDebt = (currency: string) => card?.debts.find((debt) => debt.currency === currency)?.amount ?? 0
  // The balances view carries neither a product's type nor a card's brand, color and last 4.
  const product = findProduct(accounts.data, id)
  const cardRow = findCard(accounts.data, id)
  const rateBps = account?.annualRateBps ?? null
  const estimate = account?.estimatedYield ?? null

  return (
    <>
      <nav aria-label={m.nav_accounts()} className="pt-6 md:pt-10">
        <BackToAccounts />
      </nav>

      <header className="grid gap-8 pt-6 pb-8 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="grid gap-4 lg:col-span-8">
          <Eyebrow>{account ? (account.bankName ?? m.label_cash()) : `${m.label_card()} / ${m.card_credit()}`}</Eyebrow>
          <h1 className="type-heading font-medium text-ink">{source.name}</h1>
          <div className="mt-4 grid gap-2">
            <p className="label-mono text-muted-foreground">{account ? m.label_balance() : m.label_debt()}</p>
            <p className="type-display font-medium break-words text-ink tabular-nums">{formatMoney(amount, source.currency)}</p>
            {card && (
              <p className="label-mono flex flex-wrap gap-x-4 text-muted-foreground tabular-nums">
                {card.debts
                  .filter((debt) => debt.currency !== card.currency)
                  .map((debt) => (
                    <span key={debt.currency}>{formatMoney(debt.amount, debt.currency)}</span>
                  ))}
                {card.available !== null && (
                  <span>{m.accounts_card_available({ amount: formatMoney(card.available, card.currency) })}</span>
                )}
              </p>
            )}
          </div>
          {card && cardRow && (
            <CardFace
              className="mt-4"
              name={cardRow.name}
              last4={cardRow.last4}
              brand={cardRow.brand}
              color={cardRow.color}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-self-end">
          <AdjustBalanceDialog
            ref={ref}
            name={source.name}
            currency={source.currency}
            currentBalance={account ? account.balance : cardDebt(source.currency)}
            debtCurrencies={card ? [...new Set([card.currency, ...card.debts.map((debt) => debt.currency)])] : undefined}
          />
          {product && (
            <EditProductDialog
              id={product.id}
              name={product.name}
              type={product.type}
              annualRateBps={product.annualRateBps}
            />
          )}
          {cardRow && <EditCardDialog card={cardRow} />}
        </div>
      </header>

      <Section
        index="01"
        label={m.source_stats()}
        action={
          <ToggleGroup
            type="single"
            className="w-32"
            aria-label={m.period_label()}
            value={months}
            onValueChange={(value) => setMonths(value as '6' | '12')}
          >
            <ToggleGroupItem value="6">{m.period_months({ count: 6 })}</ToggleGroupItem>
            <ToggleGroupItem value="12">{m.period_months({ count: 12 })}</ToggleGroupItem>
          </ToggleGroup>
        }
      >
        <PeriodTotals
          currency={source.currency}
          filters={{ ...lastMonths(Number(months)), sourceType: type, sourceId: id }}
          showNet
        />
        <BalanceChart className="mt-10" currency={source.currency} source={ref} />
      </Section>

      {rateBps !== null && estimate && (
        <Section index="02" label={m.source_yield()}>
          <dl className={`${rowsClass} sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
            <div className="flex items-baseline justify-between gap-4 py-4 sm:block sm:px-5 sm:py-6 sm:first:pl-0">
              <dt className="label-mono text-muted-foreground">{m.source_yield_rate_label()}</dt>
              <dd className="font-medium text-ink tabular-nums sm:mt-3 sm:type-heading-sm">
                {m.source_yield_rate({ rate: formatNumber(bpsToPercent(rateBps)) })}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-4 sm:block sm:px-5 sm:py-6">
              <dt className="label-mono text-muted-foreground">{m.source_yield_monthly_label()}</dt>
              <dd className="font-medium text-soft tabular-nums sm:mt-3 sm:type-heading-sm">
                {m.source_yield_monthly({ amount: formatMoney(estimate.monthly, source.currency) })}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-4 sm:block sm:px-5 sm:py-6">
              <dt className="label-mono text-muted-foreground">{m.source_yield_daily_label()}</dt>
              <dd className="font-medium text-soft tabular-nums sm:mt-3 sm:type-heading-sm">
                {m.source_yield_daily({ amount: formatMoney(estimate.daily, source.currency) })}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">{m.source_yield_note()}</p>
        </Section>
      )}

      <SourceCosts sourceRef={ref} index={estimate ? '03' : '02'} />

      <Section
        index={estimate ? '04' : '03'}
        label={m.overview_recent()}
        action={<ViewAll to="/transactions" search={{ source: sourceKey(ref) }} />}
      >
        {recent.isPending ? (
          <ListSkeleton rows={4} />
        ) : recent.error ? (
          <p role="alert" className="text-sm text-destructive">
            {recent.error.message}
          </p>
        ) : recent.data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.transactions_empty()}</EmptyTitle>
              <EmptyDescription>{m.source_recent_empty()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className={rowsClass}>
            {recent.data.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} showSource={type === 'product'} />
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
