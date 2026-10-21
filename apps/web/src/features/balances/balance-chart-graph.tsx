import { useState } from 'react'
import { cn } from 'cn'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import type { SourceRef } from '#/features/accounts/sources'
import { currentLocale, m } from '#/shared/i18n'
import { formatCompact, formatMoney } from '#/shared/money'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/shared/ui/chart'
import { Skeleton } from '#/shared/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { useBalanceHistory } from './balances-api'

type Range = '3' | '12'

/** One point of the chart, in cents: the API sends decimals and every sum goes through cents. */
type Point = { at: string; label: string; assets: number; liabilities: number | null }

export type BalanceChartProps = {
  currency: string
  /** A source page asks for that source's balance instead of the user's totals. */
  source?: SourceRef
  className?: string
}

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

const tick = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }

/** Assets solid in ink, liabilities dashed in muted: the dash tells them apart without relying on tone. */
const series = {
  assets: { stroke: 'var(--ink)', dash: undefined },
  liabilities: { stroke: 'var(--muted-ink)', dash: '4 4' },
} as const

/**
 * Month-end assets and liabilities (or one source's own balance), as a line chart. The table under it
 * is the same data for screen readers, since a chart is a picture of them. Recharts lives here only,
 * so the overview loads this file after its first paint (see `balance-chart.tsx`).
 */
export default function BalanceChartGraph({ currency, source, className }: BalanceChartProps) {
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
  const keys = source ? (['assets'] as const) : (['assets', 'liabilities'] as const)

  return (
    <div className={cn('grid gap-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="label-mono text-muted-foreground">{m.history_title()}</p>
          {/* The sr-only table names the series, so the legend is visual only. */}
          <ul className="flex gap-5" aria-hidden="true">
            {keys.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <svg width="16" height="2" className="shrink-0">
                  <line x1="0" y1="1" x2="16" y2="1" stroke={series[key].stroke} strokeWidth="2" strokeDasharray={series[key].dash} />
                </svg>
                <span className="label-mono text-soft">{config[key].label}</span>
              </li>
            ))}
          </ul>
        </div>
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
          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <YAxis
            width={56}
            tickCount={4}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={tick}
            tickFormatter={(value) => formatCompact(Number(value))}
          />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            padding={{ left: 12, right: 12 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={tick}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--line-strong)' }}
            content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), currency)} />}
          />
          {keys.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={series[key].stroke}
              strokeDasharray={series[key].dash}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: series[key].stroke, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>

      {/* The table is the chart's data for screen readers. It hides inside a wrapper: a table's own
          clipping never reaches its caption box, so Firefox and Safari painted the caption over
          the chart. */}
      <div className="sr-only">
        <table>
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
    </div>
  )
}
