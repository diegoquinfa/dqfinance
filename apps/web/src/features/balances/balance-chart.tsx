import { useState } from 'react'
import { cn } from 'cn'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import type { SourceRef } from '#/features/accounts/sources'
import { currentLocale, m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/shared/ui/chart'
import { Skeleton } from '#/shared/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { useBalanceHistory } from './balances-api'

type Range = '3' | '12'

/** One point of the chart, in cents: the API sends decimals and every sum goes through cents. */
type Point = { at: string; label: string; assets: number; liabilities: number | null }

const cents = (amount: number) => Math.round(amount * 100) / 100

// Intl formatters are expensive to build and one tick renders per point.
const monthFormats = new Map<string, Intl.DateTimeFormat>()
const monthLabel = (at: string) => {
  const locale = currentLocale()
  let format = monthFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    monthFormats.set(locale, format)
  }
  return format.format(new Date(at))
}

/**
 * Month-end assets and liabilities (or one source's own balance), as a line chart. The table under it
 * is the same data for screen readers, since a chart is a picture of them.
 */
export function BalanceChart({
  currency,
  source,
  className,
}: {
  currency: string
  /** A source page asks for that source's balance instead of the user's totals. */
  source?: SourceRef
  className?: string
}) {
  const [range, setRange] = useState<Range>('3')
  const history = useBalanceHistory({
    months: Number(range),
    ...(source && { sourceType: source.type, sourceId: source.id }),
  })

  if (history.isPending) return <Skeleton className={cn('h-56 w-full', className)} aria-busy="true" />
  if (history.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {history.error.message}
      </p>
    )
  }

  const points: Point[] = history.data.map((point) => {
    const total = point.totals.find((entry) => entry.currency === currency)
    return {
      at: point.at,
      label: monthLabel(point.at),
      assets: source ? cents(point.source?.amount ?? 0) : cents(total?.assets ?? 0),
      liabilities: source ? null : cents(total?.liabilities ?? 0),
    }
  })
  if (points.length === 0) return null

  const config = {
    assets: { label: source ? m.label_balance() : m.overview_assets() },
    liabilities: { label: m.overview_liabilities() },
  } satisfies ChartConfig

  return (
    <div className={cn('grid gap-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="label-mono text-muted-foreground">{m.history_title()}</p>
        <ToggleGroup
          type="single"
          size="sm"
          className="w-28"
          aria-label={m.history_range()}
          value={range}
          onValueChange={(value) => setRange(value as Range)}
        >
          <ToggleGroupItem value="3">{m.period_months({ count: 3 })}</ToggleGroupItem>
          <ToggleGroupItem value="12">{m.period_months({ count: 12 })}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ChartContainer
        config={config}
        className="h-56 w-full"
        role="img"
        aria-label={source ? m.history_aria_source({ currency }) : m.history_aria_totals({ currency })}
      >
        {/* The container is the labeled image and the table under it is the data, so the SVG stays presentational. */}
        <LineChart
          data={points}
          accessibilityLayer={false}
          margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" formatter={(value) => formatMoney(Number(value), currency)} />}
          />
          <Line
            dataKey="assets"
            type="monotone"
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {!source && (
            <Line
              dataKey="liabilities"
              type="monotone"
              stroke="var(--muted-ink)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ChartContainer>

      <table className="sr-only">
        <caption>{m.history_table_caption({ currency })}</caption>
        <thead>
          <tr>
            <th scope="col">{m.history_month()}</th>
            <th scope="col">{m.overview_assets()}</th>
            {!source && <th scope="col">{m.overview_liabilities()}</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.at}>
              <th scope="row">{point.label}</th>
              <td>{formatMoney(point.assets, currency)}</td>
              {point.liabilities !== null && <td>{formatMoney(point.liabilities, currency)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
