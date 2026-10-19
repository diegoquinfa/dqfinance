import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useSources } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { PageHeader, rowsClass } from '#/shared/ui/page'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { NewTransactionDialog } from './new-transaction-dialog'
import { TransactionRow } from './transaction-row'
import { useTransactions, type NewTransaction } from './transactions-api'

type TypeFilter = NewTransaction['type'] | 'all'

export function TransactionsPage() {
  // Filters are search params (see routes/_app/transactions.tsx), so they survive a reload.
  const search = useSearch({ from: '/_app/transactions' })
  const navigate = useNavigate()
  const type = search.type ?? 'all'
  const sourceKey = search.source ?? ''
  const from = search.from ?? ''
  const to = search.to ?? ''
  const counterpartyId = search.counterpartyId ?? ''
  const { sources } = useSources()
  const selected = sources.find((source) => source.key === sourceKey)

  const setFilters = (patch: Partial<typeof search>) =>
    void navigate({ to: '/transactions', search: (previous) => ({ ...previous, ...patch }), replace: true })

  const transactions = useTransactions({
    limit: 100,
    type: type === 'all' ? undefined : type,
    sourceType: selected?.ref.type,
    sourceId: selected?.ref.id,
    from: from || undefined,
    to: to || undefined,
    counterpartyId: counterpartyId || undefined,
  })

  return (
    <>
      <PageHeader
        title={m.transactions_title()}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/transactions/import">{m.transactions_import()}</Link>
            </Button>
            <NewTransactionDialog trigger={<Button variant="outline">{m.transactions_new()}</Button>} />
          </>
        }
      />

      <section aria-label={m.transactions_filters()} className="grid items-end gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <ToggleGroup
          type="single"
          className="w-full sm:col-span-2 lg:col-span-1"
          aria-label={m.label_kind()}
          value={type}
          onValueChange={(value) => setFilters({ type: value as TypeFilter })}
        >
          <ToggleGroupItem value="all">{m.transactions_all_types()}</ToggleGroupItem>
          <ToggleGroupItem value="expense">{m.label_expense()}</ToggleGroupItem>
          <ToggleGroupItem value="income">{m.label_income()}</ToggleGroupItem>
        </ToggleGroup>
        <SourceSelect
          id="filter-source"
          label={m.label_source()}
          options={sources}
          value={sourceKey}
          onChange={(key) => setFilters({ source: key })}
          className="sm:col-span-2 lg:col-span-1"
        />
        <Field>
          <FieldLabel htmlFor="filter-from">{m.label_from()}</FieldLabel>
          <Input
            id="filter-from"
            type="date"
            value={from}
            onChange={(event) => setFilters({ from: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="filter-to">{m.label_to()}</FieldLabel>
          <Input id="filter-to" type="date" value={to} onChange={(event) => setFilters({ to: event.target.value })} />
        </Field>
      </section>

      {transactions.isPending ? (
        <ListSkeleton rows={6} />
      ) : transactions.error ? (
        <p role="alert" className="text-sm text-destructive">
          {transactions.error.message}
        </p>
      ) : transactions.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.transactions_empty()}</EmptyTitle>
            <EmptyDescription>{m.transactions_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
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
