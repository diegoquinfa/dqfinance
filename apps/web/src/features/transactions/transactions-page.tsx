import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { SlidersHorizontal, X } from 'lucide-react'
import { useSources, type SourceOption } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { formatDay, isoToDay } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { PageHeader, rowsClass } from '#/shared/ui/page'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toggleVariants } from '#/shared/ui/toggle-variants'
import { NewTransactionDialog } from './new-transaction-dialog'
import { TransactionRow } from './transaction-row'
import { useTransactions, type NewTransaction, type Transaction } from './transactions-api'

type TypeFilter = NewTransaction['type'] | 'all'
type Filters = { source: string; from: string; to: string }

/** Source and date range. Rendered inline on desktop and in a sheet on mobile, so the ids take a prefix. */
function FilterFields({
  idPrefix,
  sources,
  filters,
  onChange,
}: {
  idPrefix: string
  sources: SourceOption[]
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
}) {
  return (
    <>
      <SourceSelect
        id={`${idPrefix}-source`}
        label={m.label_source()}
        emptyLabel={m.transactions_all_sources()}
        options={sources}
        value={filters.source}
        onChange={(key) => onChange({ source: key })}
      />
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-from`}>{m.label_date_from()}</FieldLabel>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={filters.from}
          onChange={(event) => onChange({ from: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-to`}>{m.label_date_to()}</FieldLabel>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={filters.to}
          onChange={(event) => onChange({ to: event.target.value })}
        />
      </Field>
    </>
  )
}

/** The filters sheet, opened from the title row on mobile: the icon is all that fits there. */
function FiltersSheet({
  sources,
  filters,
  onChange,
}: {
  sources: SourceOption[]
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
}) {
  return (
    <DialogPanel
      title={m.transactions_filters()}
      trigger={
        <Button variant="outline" size="icon" aria-label={m.transactions_filters()}>
          <SlidersHorizontal aria-hidden />
        </Button>
      }
    >
      {(close) => (
        <div className="grid gap-5">
          <FilterFields idPrefix="sheet" sources={sources} filters={filters} onChange={onChange} />
          <Button onClick={close}>{m.action_close()}</Button>
        </div>
      )}
    </DialogPanel>
  )
}

/** Movements in their list order (newest first), grouped under the day they happened. */
function groupByDay(transactions: Transaction[]) {
  const days = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    const day = isoToDay(transaction.occurredAt)
    days.set(day, [...(days.get(day) ?? []), transaction])
  }
  return [...days]
}

export function TransactionsPage() {
  // Filters are search params (see routes/_app/transactions.tsx), so they survive a reload.
  const search = useSearch({ from: '/_app/transactions' })
  const navigate = useNavigate()
  const type = search.type ?? 'all'
  const filters: Filters = { source: search.source ?? '', from: search.from ?? '', to: search.to ?? '' }
  const counterpartyId = search.counterpartyId ?? ''
  const { sources } = useSources()
  const selected = sources.find((source) => source.key === filters.source)

  const setFilters = (patch: Partial<typeof search>) =>
    void navigate({ to: '/transactions', search: (previous) => ({ ...previous, ...patch }), replace: true })

  const transactions = useTransactions({
    limit: 100,
    type: type === 'all' ? undefined : type,
    sourceType: selected?.ref.type,
    sourceId: selected?.ref.id,
    from: filters.from || undefined,
    to: filters.to || undefined,
    counterpartyId: counterpartyId || undefined,
  })

  // On mobile the sheet hides the values, so each active filter shows as a chip that clears it.
  const chips = [
    selected && { label: `${selected.group} · ${selected.label}`, clear: { source: '' } },
    filters.from && { label: `${m.label_date_from()} ${formatDay(filters.from)}`, clear: { from: '' } },
    filters.to && { label: `${m.label_date_to()} ${formatDay(filters.to)}`, clear: { to: '' } },
  ].filter((chip) => !!chip)

  return (
    <>
      <PageHeader
        title={m.transactions_title()}
        // On mobile the import and the filters sit beside the title; below lg the bottom bar's
        // "+" records a movement.
        mobileActions={
          <div className="flex items-center gap-2">
            <FiltersSheet sources={sources} filters={filters} onChange={setFilters} />
            <Button variant="outline" asChild>
              <Link to="/transactions/import">{m.transactions_import()}</Link>
            </Button>
          </div>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/transactions/import">{m.transactions_import()}</Link>
            </Button>
            <NewTransactionDialog trigger={<Button variant="outline">{m.transactions_new()}</Button>} />
          </>
        }
      />

      <section aria-label={m.transactions_filters()} className="grid gap-3 pb-8 lg:grid-cols-4 lg:items-end lg:gap-4">
        <ToggleGroup
          type="single"
          className="w-full"
          aria-label={m.label_kind()}
          value={type}
          onValueChange={(value) => setFilters({ type: value as TypeFilter })}
        >
          <ToggleGroupItem value="all">{m.transactions_all_types()}</ToggleGroupItem>
          <ToggleGroupItem value="expense">{m.label_expense()}</ToggleGroupItem>
          <ToggleGroupItem value="income">{m.label_income()}</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={toggleVariants({ variant: 'outline' })}
              aria-label={m.transactions_remove_filter({ filter: chip.label })}
              onClick={() => setFilters(chip.clear)}
            >
              {chip.label}
              <X aria-hidden />
            </button>
          ))}
        </div>

        <div className="hidden lg:contents">
          <FilterFields idPrefix="filter" sources={sources} filters={filters} onChange={setFilters} />
        </div>
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
        <div className="grid gap-8">
          {groupByDay(transactions.data).map(([day, dayTransactions]) => (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2 id={`day-${day}`} className="label-mono pb-3 text-muted-foreground">
                <time dateTime={day}>{formatDay(day)}</time>
              </h2>
              <ul className={rowsClass}>
                {dayTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    showDate={false}
                    // A source filter makes the source the same on every row.
                    showSource={!selected}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
