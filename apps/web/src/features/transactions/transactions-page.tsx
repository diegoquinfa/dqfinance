import { useState } from 'react'
import { useSources } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney, formatSignedAmount } from '#/shared/money'
import { Button } from '#/shared/ui/button'
import { EmptyState, Field, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Segmented } from '#/shared/ui/segmented'
import { NewTransactionDialog } from './new-transaction-dialog'
import { useTransactions, type NewTransaction } from './transactions-api'

type TypeFilter = NewTransaction['type'] | 'all'

export function TransactionsPage() {
  const [type, setType] = useState<TypeFilter>('all')
  const [sourceKey, setSourceKey] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { sources } = useSources()
  const selected = sources.find((source) => source.key === sourceKey)

  const transactions = useTransactions({
    limit: 100,
    type: type === 'all' ? undefined : type,
    sourceType: selected?.ref.type,
    sourceId: selected?.ref.id,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{m.transactions_title()}</h1>
        <NewTransactionDialog trigger={<Button>{m.transactions_new()}</Button>} />
      </div>

      <section aria-label={m.transactions_filters()} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Segmented
          name={m.label_kind()}
          className="sm:col-span-2 lg:col-span-1"
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: m.transactions_all_types() },
            { value: 'expense', label: m.label_expense() },
            { value: 'income', label: m.label_income() },
          ]}
        />
        <SourceSelect
          id="filter-source"
          label={m.label_source()}
          options={sources}
          value={sourceKey}
          onChange={setSourceKey}
          className="sm:col-span-2 lg:col-span-1"
        />
        <Field id="filter-from" label={m.label_from()}>
          <Input id="filter-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field id="filter-to" label={m.label_to()}>
          <Input id="filter-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
      </section>

      {transactions.isPending ? (
        <ListSkeleton rows={6} />
      ) : transactions.error ? (
        <p role="alert" className="text-sm text-destructive">
          {transactions.error.message}
        </p>
      ) : transactions.data.length === 0 ? (
        <EmptyState title={m.transactions_empty()} description={m.transactions_empty_description()} />
      ) : (
        <ul className="divide-y">
          {transactions.data.map((transaction) => (
            <li key={transaction.id} className="flex items-baseline justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {transaction.description || transaction.category.name}
                  {transaction.counterparty && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {transaction.counterparty.name}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time>
                  {' · '}
                  {transaction.source.name}
                  {' · '}
                  {transaction.category.name}
                </p>
              </div>
              <p
                className={
                  transaction.type === 'income'
                    ? 'flex shrink-0 items-baseline gap-2 font-medium text-income tabular-nums'
                    : 'flex shrink-0 items-baseline gap-2 font-medium tabular-nums'
                }
              >
                <span className="sr-only">{transaction.type === 'income' ? m.label_income() : m.label_expense()}: </span>
                {transaction.primaryAmount !== null && transaction.primaryCurrency !== null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatMoney(transaction.amount, transaction.currency)}
                  </span>
                )}
                {transaction.primaryAmount !== null && transaction.primaryCurrency !== null
                  ? formatSignedAmount(transaction.type, transaction.primaryAmount, transaction.primaryCurrency)
                  : formatSignedAmount(transaction.type, transaction.amount, transaction.currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
