import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTransactionSummary, type SummaryFilters } from '#/features/transactions/transactions-api'
import { currentLocale, m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { periodRange, type Period } from '#/shared/periods'
import { Button } from '#/shared/ui/button'
import { rowsClass } from '#/shared/ui/page'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { totalsIn } from './totals'

/** Spent and received (and net) in one currency for the given filters. Totals come from the API. */
export function PeriodTotals({
  currency,
  filters,
  showNet = false,
}: {
  currency: string
  filters: SummaryFilters
  showNet?: boolean
}) {
  const summary = useTransactionSummary(filters)
  const totals = totalsIn(summary.data ?? [], currency)
  const items = [
    { label: m.overview_spent(), amount: totals.expense, marker: '↓', income: false },
    { label: m.overview_received(), amount: totals.income, marker: '↑', income: true },
    ...(showNet ? [{ label: m.label_net(), amount: totals.net, marker: '=', income: false }] : []),
  ]

  if (summary.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {summary.error.message}
      </p>
    )
  }

  return (
    <dl
      aria-busy={summary.isPending || summary.isPlaceholderData}
      className={`${rowsClass} sm:grid sm:divide-x sm:divide-y-0 ${showNet ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 py-4 sm:block sm:px-5 sm:py-6 sm:first:pl-0">
          <dt className="label-mono text-muted-foreground">
            <span aria-hidden className="mr-2 text-faint">
              {item.marker}
            </span>
            {item.label}
          </dt>
          <dd
            className={`font-medium tabular-nums transition-opacity sm:mt-3 ${showNet ? 'sm:type-heading-sm' : 'sm:type-heading'} ${item.income && item.amount > 0 ? 'text-income' : 'text-ink'} ${summary.isPending ? 'opacity-0' : summary.isPlaceholderData ? 'opacity-50' : ''}`}
          >
            {formatMoney(item.amount, currency)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const dayDate = (day: string) => new Date(`${day}T12:00`)

function periodLabel(period: Period, offset: number, range: { from: string; to: string }) {
  if (offset === 0) {
    return { week: m.period_this_week, month: m.period_this_month, year: m.period_this_year }[period]()
  }
  const locale = currentLocale()
  const from = dayDate(range.from)
  if (period === 'year') return String(from.getFullYear())
  if (period === 'month') return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(from)
  const last = dayDate(range.to)
  last.setDate(last.getDate() - 1)
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  return `${short.format(from)} - ${short.format(last)}`
}

/** Week / month / year with previous and next, then what was spent and received in it. */
export function CalendarPeriod({ currency }: { currency: string }) {
  const [period, setPeriod] = useState<Period>('month')
  const [offset, setOffset] = useState(0)
  const range = periodRange(period, offset)

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
        <ToggleGroup
          type="single"
          aria-label={m.period_label()}
          value={period}
          onValueChange={(value) => {
            setPeriod(value as Period)
            setOffset(0)
          }}
        >
          <ToggleGroupItem value="week">{m.period_week()}</ToggleGroupItem>
          <ToggleGroupItem value="month">{m.period_month()}</ToggleGroupItem>
          <ToggleGroupItem value="year">{m.period_year()}</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon-sm" aria-label={m.period_previous()} onClick={() => setOffset(offset - 1)}>
            <ChevronLeft aria-hidden />
          </Button>
          <p aria-live="polite" className="label-mono text-center text-ink">
            {periodLabel(period, offset, range)}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.period_next()}
            disabled={offset === 0}
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <PeriodTotals currency={currency} filters={range} />
    </div>
  )
}
