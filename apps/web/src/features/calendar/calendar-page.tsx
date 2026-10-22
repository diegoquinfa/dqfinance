import { useNavigate, useSearch } from '@tanstack/react-router'
import { cn } from 'cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ViewAll } from '#/features/balances/overview-page'
import { useSettings } from '#/features/settings/settings-api'
import { sourceLabel } from '#/shared/source-label'
import { TransactionRow } from '#/features/transactions/transaction-row'
import { useTransactions } from '#/features/transactions/transactions-api'
import { formatDay, isoToDay, today } from '#/shared/dates'
import { currentLocale, m } from '#/shared/i18n'
import { formatCompact, formatMoney, formatSignedAmount } from '#/shared/money'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { useCalendar, type Calendar } from './calendar-api'
import { monthGrid, monthTotals, shiftDay } from './calendar-month'

type Due = Calendar['due'][number]

// Intl formatters are expensive to build and the grid renders on every month change.
const formatters = new Map<string, Intl.DateTimeFormat>()
const formatter = (options: Intl.DateTimeFormatOptions) => {
  const key = `${currentLocale()}/${JSON.stringify(options)}`
  let cached = formatters.get(key)
  if (!cached) {
    cached = new Intl.DateTimeFormat(currentLocale(), options)
    formatters.set(key, cached)
  }
  return cached
}

// 2024-01-01 is a Monday: seven days from it name the weekdays in the user's language.
const weekdays = (weekday: 'narrow' | 'short') =>
  Array.from({ length: 7 }, (_, i) => formatter({ weekday }).format(new Date(2024, 0, 1 + i)))

const monthLabel = (from: string) => formatter({ month: 'long', year: 'numeric' }).format(new Date(`${from}T12:00`))

/** A month as a grid: what was spent and received each day, and the recurring expenses due. */
export function CalendarPage() {
  const search = useSearch({ from: '/_app/calendar' })
  const navigate = useNavigate()
  const offset = search.month ?? 0
  const grid = monthGrid(offset)
  const calendar = useCalendar({ from: grid.from, to: grid.to })
  const settings = useSettings()
  const currency = settings.data?.primaryCurrency ?? 'USD'
  const todayDay = today()
  const selected = search.day ?? (offset === 0 ? todayDay : undefined)
  const days = calendar.data?.days ?? []
  const due = calendar.data?.due ?? []
  const totals = monthTotals(days, due, currency)

  const go = (patch: { month?: number; day?: string }) =>
    void navigate({ to: '/calendar', search: (previous) => ({ ...previous, ...patch }), replace: true })

  return (
    <>
      <PageHeader title={m.calendar_title()} />

      <Section
        index="01"
        label={monthLabel(grid.from)}
        action={
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.calendar_previous_month()}
              onClick={() => go({ month: offset - 1, day: undefined })}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.calendar_next_month()}
              onClick={() => go({ month: offset + 1, day: undefined })}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        }
      >
        <dl className={`${rowsClass} sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
          {[
            { label: m.overview_spent(), amount: totals.spent, tone: 'text-ink' },
            { label: m.overview_received(), amount: totals.received, tone: totals.received > 0 ? 'text-income' : 'text-ink' },
            { label: m.calendar_due(), amount: totals.due, tone: 'text-muted-foreground' },
          ].map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-4 py-4 sm:block sm:px-5 sm:py-6 sm:first:pl-0">
              <dt className="label-mono text-muted-foreground">{item.label}</dt>
              <dd className={cn('font-medium tabular-nums sm:mt-3 sm:type-heading-sm', item.tone, calendar.isPending && 'opacity-0')}>
                {formatMoney(item.amount, currency)}
              </dd>
            </div>
          ))}
        </dl>

        {calendar.error && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {calendar.error.message}
          </p>
        )}

        <div aria-hidden className="mt-8 grid grid-cols-7 pb-2">
          {weekdays('short').map((name, i) => (
            <span key={name} className="label-mono text-muted-foreground">
              <span className="max-sm:hidden">{name}</span>
              <span className="sm:hidden">{weekdays('narrow')[i]}</span>
            </span>
          ))}
        </div>
        <div
          aria-busy={calendar.isPending || calendar.isPlaceholderData}
          className={cn('grid grid-cols-7 border-t border-l border-line transition-opacity', calendar.isPlaceholderData && 'opacity-50')}
        >
          {grid.cells.map((day, i) =>
            day ? (
              <DayCell
                key={day}
                day={day}
                currency={currency}
                totals={days.find((entry) => entry.day === day && entry.currency === currency)}
                due={due.filter((item) => item.day === day)}
                isToday={day === todayDay}
                selected={day === selected}
                onSelect={() => go({ day })}
              />
            ) : (
              <div key={`pad-${i}`} aria-hidden className="border-r border-b border-line" />
            ),
          )}
        </div>
      </Section>

      {selected && <DaySection day={selected} due={due.filter((item) => item.day === selected)} />}
    </>
  )
}

function DayCell({
  day,
  currency,
  totals,
  due,
  isToday,
  selected,
  onSelect,
}: {
  day: string
  currency: string
  totals: { spent: number; received: number } | undefined
  due: Due[]
  isToday: boolean
  selected: boolean
  onSelect: () => void
}) {
  const spent = totals?.spent ?? 0
  const received = totals?.received ?? 0
  const dueAmount = due.filter((item) => item.currency === currency).reduce((sum, item) => sum + item.amount, 0)
  const label = [
    formatDay(day),
    spent > 0 && `${m.overview_spent()} ${formatMoney(spent, currency)}`,
    received > 0 && `${m.overview_received()} ${formatMoney(received, currency)}`,
    due.length > 0 && `${m.calendar_due()} ${due.length}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'flex min-h-14 flex-col items-start gap-1 border-r border-b border-line p-1.5 text-left transition-colors hover:bg-surface sm:min-h-24 sm:p-2',
        selected && 'bg-surface',
      )}
    >
      <span className={cn('label-mono', isToday ? 'text-signal' : selected ? 'text-ink' : 'text-muted-foreground')}>
        {Number(day.slice(8))}
      </span>
      {/* Mobile cells are too narrow for amounts: a dot per kind, the day below gives the figures. */}
      <span className="flex gap-1 sm:hidden">
        {spent > 0 && <span className="size-1.5 rounded-full bg-ink" />}
        {received > 0 && <span className="size-1.5 rounded-full bg-income" />}
        {due.length > 0 && <span className="size-1.5 rounded-full border border-muted-foreground" />}
      </span>
      {spent > 0 && <span className="label-mono text-ink tabular-nums max-sm:hidden">−{formatCompact(spent)}</span>}
      {received > 0 && <span className="label-mono text-income tabular-nums max-sm:hidden">+{formatCompact(received)}</span>}
      {due.length > 0 && (
        <span className="label-mono text-muted-foreground tabular-nums max-sm:hidden">
          ↻{dueAmount > 0 && ` ${formatCompact(dueAmount)}`}
        </span>
      )}
    </button>
  )
}

/** One day: the recurring expenses due, then what moved. */
function DaySection({ day, due }: { day: string; due: Due[] }) {
  // The list filters by UTC days: a day of margin each side, then keep the local day.
  const movements = useTransactions({ from: shiftDay(day, -1), to: shiftDay(day, 2), limit: 200 })
  const onDay = (movements.data ?? []).filter((transaction) => isoToDay(transaction.occurredAt) === day)

  return (
    <Section index="02" label={formatDay(day)} action={due.length > 0 ? <ViewAll to="/recurring" /> : undefined}>
      {movements.isPending ? (
        <ListSkeleton rows={3} />
      ) : movements.error ? (
        <p role="alert" className="text-sm text-destructive">
          {movements.error.message}
        </p>
      ) : due.length === 0 && onDay.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.calendar_day_empty()}</p>
      ) : (
        <ul className={rowsClass}>
          {due.map((item) => (
            <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <span className="truncate">{item.name}</span>
                <Badge variant="outline">{m.calendar_due()}</Badge>
              </span>
              <span className="text-right font-medium text-muted-foreground tabular-nums">
                <span className="sr-only">{m.label_expense()}: </span>
                {formatSignedAmount('expense', item.amount, item.currency)}
              </span>
              <span className="label-mono truncate text-muted-foreground">
                {sourceLabel(item.source)} / {item.category.name}
              </span>
            </li>
          ))}
          {onDay.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} showDate={false} />
          ))}
        </ul>
      )}
    </Section>
  )
}
