import { cn } from 'cn'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { formatDay } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatCompact, formatMoney } from '#/shared/money'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/shared/ui/chart'
import { Skeleton } from '#/shared/ui/skeleton'
import { useForecast } from './spending-api'

type Point = { at: string; label: string; balance: number }

const tick = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }

const config = { balance: { label: m.forecast_balance() } } satisfies ChartConfig

/**
 * The projected balance of each day until the end of the month. The line at zero says when the
 * money runs out. The table under it is the same data for screen readers, since a chart is a
 * picture of them.
 */
export default function ForecastChartGraph({ className }: { className?: string }) {
  const forecast = useForecast()

  if (forecast.isPending) return <Skeleton className={cn('h-56 w-full', className)} aria-busy="true" />
  if (forecast.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {forecast.error.message}
      </p>
    )
  }

  const data = forecast.data
  const points: Point[] = data.days.map((day) => ({
    at: day.day,
    label: day.day.slice(-2),
    balance: day.balance,
  }))
  if (points.length === 0) return null

  return (
    <div className={cn('grid gap-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-mono text-muted-foreground">{m.forecast_title()}</p>
        {data.lowest && (
          <p className="label-mono text-soft">
            {m.forecast_lowest({ day: formatDay(data.lowest.day), amount: formatMoney(data.lowest.balance, data.currency) })}
          </p>
        )}
      </div>

      <ChartContainer
        config={config}
        className="h-56 w-full"
        role="img"
        aria-label={m.forecast_aria({ from: formatDay(data.day), to: formatDay(data.periodEnd) })}
      >
        <LineChart data={points} accessibilityLayer={false} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
          {/* The line at zero says when the money runs out. */}
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <ChartTooltip
            cursor={{ stroke: 'var(--line-strong)' }}
            content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), data.currency)} />}
          />
          <Line
            dataKey="balance"
            type="monotone"
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: 'var(--ink)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>

      {/* The table is the chart's data for screen readers. */}
      <div className="sr-only">
        <table>
          <caption>{m.forecast_table_caption()}</caption>
          <thead>
            <tr>
              <th scope="col">{m.forecast_day()}</th>
              <th scope="col">{m.forecast_balance()}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.at}>
                <th scope="row">{formatDay(point.at)}</th>
                <td>{formatMoney(point.balance, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
