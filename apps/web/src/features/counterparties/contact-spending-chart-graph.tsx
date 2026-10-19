import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { currentLocale, m } from '#/shared/i18n'
import { formatCompact, formatMoney } from '#/shared/money'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/shared/ui/chart'
import type { CounterpartyDetail } from './counterparties-api'

type Point = { month: string; label: string; spent: number; received: number }

// The months are already in the user's locale: "2026-08" is August.
const monthFormats = new Map<string, Intl.DateTimeFormat>()
const monthLabel = (month: string, locale: string) => {
  let format = monthFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    monthFormats.set(locale, format)
  }
  return format.format(new Date(`${month}-01T00:00:00Z`))
}

/** Spending per month: solid in ink, income dashed in muted, so the two read apart without a legend. */
const series = {
  spent: { stroke: 'var(--ink)', dash: undefined },
  received: { stroke: 'var(--muted-ink)', dash: '4 4' },
} as const

/**
 * The monthly series of one contact, one currency. The chart is the labeled image; the amounts
 * are in the tooltip and the categories are in the section above.
 */
export default function ContactSpendingChartGraph({
  name,
  monthly,
  currency,
  className,
}: {
  name: string
  monthly: CounterpartyDetail['monthly']
  currency: string
  className?: string
}) {
  const locale = currentLocale()
  const points: Point[] = monthly
    .filter((row) => row.currency === currency)
    .map((row) => ({
      month: row.month,
      label: monthLabel(row.month, locale),
      spent: row.spent,
      received: row.received,
    }))
  if (points.length === 0) return null

  const config = {
    spent: { label: m.label_expense() },
    received: { label: m.label_income() },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      className={className ?? 'h-48 w-full'}
      role="img"
      aria-label={m.contacts_chart_aria({ name, currency })}
    >
      <LineChart data={points} accessibilityLayer={false} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <YAxis
          width={56}
          tickCount={4}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }}
          tickFormatter={(value) => formatCompact(Number(value))}
        />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          padding={{ left: 12, right: 12 }}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--line-strong)' }}
          content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), currency)} />}
        />
        <Line
          dataKey="spent"
          type="monotone"
          stroke={series.spent.stroke}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: series.spent.stroke, strokeWidth: 0 }}
          isAnimationActive={false}
        />
        <Line
          dataKey="received"
          type="monotone"
          stroke={series.received.stroke}
          strokeDasharray={series.received.dash}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: series.received.stroke, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
