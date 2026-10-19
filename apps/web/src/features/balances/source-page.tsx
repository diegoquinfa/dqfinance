import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { AdjustBalanceDialog } from '#/features/accounts/adjust-balance-dialog'
import type { SourceRef } from '#/features/accounts/sources'
import { TransactionRow } from '#/features/transactions/transaction-row'
import { useTransactions } from '#/features/transactions/transactions-api'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { lastMonths } from '#/shared/periods'
import { EmptyState, ListSkeleton } from '#/shared/ui/field'
import { Eyebrow, Section, rowsClass } from '#/shared/ui/page'
import { Segmented } from '#/shared/ui/segmented'
import { useBalances } from './balances-api'
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
  const [months, setMonths] = useState<'6' | '12'>('6')
  const recent = useTransactions({ limit: 20, sourceType: type, sourceId: id })

  if (balances.isPending) {
    return (
      <div className="grid gap-6 py-10" aria-busy="true">
        <div className="h-4 w-24 animate-pulse bg-surface" />
        <div className="h-16 w-1/2 animate-pulse bg-surface md:h-20" />
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
        <EmptyState title={m.source_not_found()} />
      </div>
    )
  }

  const ref: SourceRef = { type, id }
  const amount = account ? account.balance : card!.total
  const cardDebt = (currency: string) => card?.debts.find((debt) => debt.currency === currency)?.amount ?? 0

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
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <AdjustBalanceDialog
            ref={ref}
            name={source.name}
            currency={source.currency}
            currentBalance={account ? account.balance : cardDebt(source.currency)}
            debtCurrencies={card ? [...new Set([card.currency, ...card.debts.map((debt) => debt.currency)])] : undefined}
          />
        </div>
      </header>

      <Section
        index="01"
        label={m.source_stats()}
        action={
          <Segmented
            name={m.period_label()}
            className="w-32"
            value={months}
            onChange={setMonths}
            options={[
              { value: '6', label: m.period_months({ count: 6 }) },
              { value: '12', label: m.period_months({ count: 12 }) },
            ]}
          />
        }
      >
        <PeriodTotals
          currency={source.currency}
          filters={{ ...lastMonths(Number(months)), sourceType: type, sourceId: id }}
          showNet
        />
      </Section>

      <Section index="02" label={m.overview_recent()}>
        {recent.isPending ? (
          <ListSkeleton rows={4} />
        ) : recent.error ? (
          <p role="alert" className="text-sm text-destructive">
            {recent.error.message}
          </p>
        ) : recent.data.length === 0 ? (
          <EmptyState title={m.transactions_empty()} description={m.source_recent_empty()} />
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
