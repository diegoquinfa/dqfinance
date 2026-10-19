import { useState } from 'react'
import { useSources } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { EmptyState, Field, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { PageHeader, rowsClass } from '#/shared/ui/page'
import { Segmented } from '#/shared/ui/segmented'
import { NewTransactionDialog } from './new-transaction-dialog'
import { TransactionRow } from './transaction-row'
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
    <>
      <PageHeader
        title={m.transactions_title()}
        actions={<NewTransactionDialog trigger={<Button variant="outline">{m.transactions_new()}</Button>} />}
      />

      <section aria-label={m.transactions_filters()} className="grid items-end gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-4">
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
        <ul className={rowsClass}>
          {transactions.data.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      )}
    </>
  )
}
