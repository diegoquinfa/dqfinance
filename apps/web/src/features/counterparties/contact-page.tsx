import { Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useSettings } from '#/features/settings/settings-api'
import { NewTransactionDialog } from '#/features/transactions/new-transaction-dialog'
import { TransactionRow } from '#/features/transactions/transaction-row'
import { useTransactions } from '#/features/transactions/transactions-api'
import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatSignedAmount } from '#/shared/money'
import { lastMonths } from '#/shared/periods'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Section, rowsClass } from '#/shared/ui/page'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { useCounterparty } from './counterparties-api'
import { ContactSpendingChart } from './contact-spending-chart'
import { kindTag } from './contact-kind'
import { ContactTotals } from './contact-row'

type Months = '6' | '12'

/**
 * One contact: its name, its kind and the money that moved, then the spending broken down by
 * category and over time, then the movements behind it.
 */
export function ContactPage({ id }: { id: string }) {
  // The list's filters travel here, so the back link returns to the list as it was.
  const listSearch = useSearch({ from: '/_app/contacts_/$id' })
  const [months, setMonths] = useState<Months>('12')
  const { data: settings } = useSettings()
  const period = lastMonths(Number(months))
  const contact = useCounterparty(id, { from: period.from })
  const movements = useTransactions({ counterpartyId: id, limit: 50 })

  if (contact.isPending) {
    return (
      <div className="grid gap-6 py-10" aria-busy="true">
        <ListSkeleton rows={4} />
      </div>
    )
  }
  if (contact.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {contact.error.message}
      </p>
    )
  }
  if (!contact.data) {
    return (
      <div className="grid gap-6 py-10">
        <BackToContacts search={listSearch} />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.contacts_not_found()}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const row = contact.data
  const primaryCurrency = settings?.primaryCurrency
  // The chart and the breakdown follow the period; the money above is the whole history, the way
  // the list shows it.
  const categories = primaryCurrency
    ? row.byCategory.filter((entry) => entry.currency === primaryCurrency)
    : row.byCategory
  const chartCurrency = primaryCurrency ?? categories[0]?.currency ?? ''
  // The numbering follows the sections that are actually on the page.
  const sectionKeys = ['categories', chartCurrency ? 'evolution' : null, 'movements'].filter(
    (key): key is string => key !== null,
  )
  const sectionIndex = (key: string) => String(sectionKeys.indexOf(key) + 1).padStart(2, '0')

  return (
    <>
      <nav aria-label={m.nav_contacts()} className="pt-6 md:pt-10">
        <BackToContacts search={listSearch} />
      </nav>

      <header className="grid gap-8 pt-6 pb-8 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="grid gap-4 lg:col-span-8">
          <h1 className="type-title font-medium text-ink">{row.name}</h1>
          <Badge variant="secondary">{kindTag(row.kind)}</Badge>
          <div className="mt-4 grid gap-2">
            <ContactTotals contact={row} primaryCurrency={primaryCurrency} size="page" />
            <p className="label-mono text-muted-foreground">
              {m.contacts_movements({ count: row.movements })}
              {row.firstMovementAt && row.lastMovementAt && (
                <>
                  <span aria-hidden className="mx-2 text-faint">
                    /
                  </span>
                  <time dateTime={row.firstMovementAt}>{formatDate(row.firstMovementAt)}</time>
                  <span aria-hidden className="mx-2 text-faint">
                    →
                  </span>
                  <time dateTime={row.lastMovementAt}>{formatDate(row.lastMovementAt)}</time>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <NewTransactionDialog
            trigger={<Button variant="outline">{m.transactions_new()}</Button>}
            defaultCounterpartyId={row.id}
          />
        </div>
      </header>

      {/* The period shapes the two sections that follow it. */}
      <section aria-label={m.contacts_period()} className="flex items-center gap-4 pb-8">
        <span className="label-mono text-muted-foreground">{m.contacts_period()}</span>
        <ToggleGroup
          type="single"
          size="sm"
          className="w-28"
          aria-label={m.contacts_period()}
          value={months}
          onValueChange={(value) => setMonths(value as Months)}
        >
          <ToggleGroupItem value="6">{m.period_months({ count: 6 })}</ToggleGroupItem>
          <ToggleGroupItem value="12">{m.period_months({ count: 12 })}</ToggleGroupItem>
        </ToggleGroup>
      </section>

      <Section index={sectionIndex('categories')} label={m.contacts_categories()}>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.contacts_no_categories()}</p>
        ) : (
          <ul className={rowsClass}>
            {categories.map((entry) => {
              const biggest = Math.max(...categories.map((item) => Math.abs(item.amount)), 1)
              return (
                <li key={`${entry.categoryId}-${entry.currency}`} className="grid gap-2 py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-ink">{entry.name}</span>
                    <span className="font-medium text-ink tabular-nums">
                      <span className="sr-only">{entry.kind === 'expense' ? m.label_expense() : m.label_income()}: </span>
                      {formatSignedAmount(
                        entry.kind === 'expense' ? 'expense' : 'income',
                        entry.amount,
                        entry.currency,
                      )}
                    </span>
                  </div>
                  {/* The bar is the share of the biggest category: the shape at a glance. */}
                  <div aria-hidden className="h-px w-full bg-line">
                    <div
                      className={entry.kind === 'expense' ? 'h-px bg-ink' : 'h-px bg-income'}
                      style={{ width: `${Math.round((Math.abs(entry.amount) / biggest) * 100)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {chartCurrency && (
        <Section index={sectionIndex('evolution')} label={m.contacts_evolution()}>
          <ContactSpendingChart name={row.name} monthly={row.monthly} currency={chartCurrency} />
        </Section>
      )}

      <Section
        index={sectionIndex('movements')}
        label={m.transactions_title()}
        action={
          movements.data && movements.data.length > 0 ? (
            <Button variant="link" asChild>
              <Link to="/transactions" search={{ counterpartyId: row.id }}>
                {m.action_view_all()}
                <span aria-hidden>→</span>
              </Link>
            </Button>
          ) : null
        }
      >
        {movements.isPending ? (
          <ListSkeleton rows={4} />
        ) : movements.error ? (
          <p role="alert" className="text-sm text-destructive">
            {movements.error.message}
          </p>
        ) : movements.data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.contacts_no_movements()}</EmptyTitle>
              <EmptyDescription>{m.contacts_no_movements_description({ name: row.name })}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewTransactionDialog
                trigger={<Button variant="outline">{m.transactions_new()}</Button>}
                defaultCounterpartyId={row.id}
              />
            </EmptyContent>
          </Empty>
        ) : (
          <ul className={rowsClass}>
            {movements.data.map((transaction) => (
              // The contact's name is already the page's title; the row does not repeat it.
              <TransactionRow key={transaction.id} transaction={transaction} showCounterparty={false} />
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function BackToContacts({ search }: { search: { kind?: 'all' | 'person' | 'business'; search?: string } }) {
  return (
    <Link
      to="/contacts"
      search={search}
      className="label-mono group inline-flex gap-2 text-muted-foreground hover:text-ink"
    >
      <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1">
        ←
      </span>
      {m.nav_contacts()}
    </Link>
  )
}
