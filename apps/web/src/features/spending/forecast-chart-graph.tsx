import { cn } from 'cn'
import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
import { formatDay } from '#/shared/dates'
import { axisSignificantDigits } from '#/shared/axis-digits'
import { m } from '#/shared/i18n'
import { formatCompact, formatMoney } from '#/shared/money'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/shared/ui/chart'
import { Skeleton } from '#/shared/ui/skeleton'
import { useForecast } from './spending-api'

/** One day of the month: what the accounts held, what they are projected to hold, or both (today). */
type Point = { at: string; label: string; actual?: number; forecast?: number }

const tick = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }
const TICK_COUNT = 4

const config = {
  actual: { label: m.forecast_actual() },
  forecast: { label: m.forecast_projected() },
} satisfies ChartConfig

/**
 * The whole month: the balance at the end of each day so far in `ink`, then the projection from
 * today to the end of the month in `signal`, dashed over a hatch because it has not happened yet.
 * The line at zero says when the money runs out. The table under it is the same data for screen
 * readers, since a chart is a picture of them.
 */
export default function ForecastChartGraph({ className }: { className?: string }) {
  const forecast = useForecast()
  const hatchId = useId()

  if (forecast.isPending) return <Skeleton className={cn('h-56 w-full', className)} aria-busy="true" />
  if (forecast.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {forecast.error.message}
      </p>
    )
  }

  const data = forecast.data
  const byDay = new Map<string, Point>()
  const pointOf = (day: string) =>
    byDay.get(day) ?? byDay.set(day, { at: day, label: String(Number(day.slice(-2))) }).get(day)!
  for (const day of data.history) pointOf(day.day).actual = day.balance
  for (const day of data.days) pointOf(day.day).forecast = day.balance
  const points = [...byDay.values()]
  if (points.length === 0) return null

  const values = points.flatMap((point) => [point.actual, point.forecast].filter((value): value is number => value !== undefined))
  const digits = axisSignificantDigits(values, TICK_COUNT)
  const today = points.find((point) => point.at === data.day)
  const last = points.at(-1)!
  // The first day, the 10th, the 20th and the last: the month reads at a glance.
  const ticks = [points[0]!.label, '10', '20', last.label].filter((label, index, all) => all.indexOf(label) === index)

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

      <p className="text-sm text-muted-foreground">
        {m.forecast_pace({ amount: formatMoney(data.dailyAverage, data.currency) })}
        {data.daysElapsed < 7 && ` ${m.forecast_pace_few_days()}`}
      </p>

      <ChartContainer
        config={config}
        className="h-56 w-full"
        role="img"
        aria-label={m.forecast_aria({ from: formatDay(points[0]!.at), to: formatDay(last.at) })}
      >
        <ComposedChart data={points} accessibilityLayer={false} margin={{ left: 0, right: 16, top: 20, bottom: 0 }}>
          <defs>
            <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" strokeWidth="1" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          {/* Wide enough for "-120 mil": a narrower axis clips the minus sign. */}
          <YAxis
            width={72}
            tickCount={TICK_COUNT}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={tick}
            tickFormatter={(value) => formatCompact(Number(value), undefined, digits)}
          />
          <XAxis
            dataKey="label"
            ticks={ticks}
            interval={0}
            padding={{ left: 12, right: 12 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={tick}
          />
          {/* The line at zero says when the money runs out. */}
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          {today && <ReferenceLine x={today.label} stroke="var(--line-strong)" strokeDasharray="2 4" />}
          <ChartTooltip
            cursor={{ stroke: 'var(--line-strong)' }}
            content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), data.currency)} />}
          />
          <Area
            dataKey="forecast"
            type="monotone"
            stroke="none"
            fill={`url(#${hatchId})`}
            isAnimationActive={false}
            activeDot={false}
            tooltipType="none"
          />
          <Line
            dataKey="actual"
            type="monotone"
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: 'var(--ink)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="forecast"
            type="monotone"
            stroke="var(--signal)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 3, fill: 'var(--signal)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {today?.forecast !== undefined && (
            <ReferenceDot x={today.label} y={today.forecast} r={3} fill="var(--canvas)" stroke="var(--ink)" strokeWidth={1.5} />
          )}
          {last.forecast !== undefined && (
            <ReferenceDot
              x={last.label}
              y={last.forecast}
              r={3}
              fill="var(--canvas)"
              stroke="var(--signal)"
              strokeWidth={1.5}
              label={{
                value: formatCompact(last.forecast, undefined, digits),
                position: 'top',
                offset: 8,
                fill: 'var(--signal)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
            />
          )}
        </ComposedChart>
      </ChartContainer>

      <ul className="flex flex-wrap justify-end gap-x-6 gap-y-1">
        <li className="label-mono flex items-center gap-2 text-muted-foreground">
          <span aria-hidden className="h-px w-4 bg-ink" />
          {m.forecast_actual()}
        </li>
        <li className="label-mono flex items-center gap-2 text-muted-foreground">
          <span aria-hidden className="w-4 border-t border-dashed border-signal" />
          {m.forecast_projected()}
        </li>
      </ul>

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
                <td>{formatMoney((point.actual ?? point.forecast)!, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
