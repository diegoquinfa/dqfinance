import { useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { currentLocale, m } from '#/shared/i18n'
import { formatCompact, formatMoney } from '#/shared/money'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/shared/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { comparePoints, type CompareContact, type CompareMode } from './compare-points'

/**
 * One tone per contact, so the lines read apart. Pastels are the one place this app leaves its
 * ink / muted palette: telling five contacts apart by tone needs hues, and the total stays `ink`.
 */
const PASTELS = ['#c9b8f0', '#a8d5c8', '#f2c6a0', '#b9d0f2', '#e8b8d0', '#d8e0a8', '#c0c0f0', '#f0d8a8']
const TOTAL = 'var(--ink)'
const pastel = (index: number) => PASTELS[index % PASTELS.length]

const tick = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--muted-ink)' }

// Intl formatters are expensive to build and one tick renders per point.
const monthFormats = new Map<string, Intl.DateTimeFormat>()
const monthLabel = (month: string, locale: string) => {
  let format = monthFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    monthFormats.set(locale, format)
  }
  return format.format(new Date(`${month}-01T00:00:00Z`))
}

/**
 * The chosen contacts month by month, one line each in a pastel tone, and the total with them in
 * ink. Expenses, incomes or their net, never two at once: two series per contact would be unreadable.
 */
export default function ContactCompareChartGraph({
  contacts,
  currency,
  className,
}: {
  contacts: CompareContact[]
  currency: string
  className?: string
}) {
  const [mode, setMode] = useState<CompareMode>('spent')
  const locale = currentLocale()
  const points = comparePoints(contacts, currency, mode, (month) => monthLabel(month, locale))
  if (points.length === 0) return null

  const config = {
    total: { label: m.contacts_compare_total() },
    ...Object.fromEntries(contacts.map((contact) => [contact.id, { label: contact.name }])),
  } satisfies ChartConfig

  return (
    <div className={className ?? 'grid gap-5'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* The sr-only table names the series, so the legend is visual only. The total leads it:
              it is what the numbers are for, and it stays in the same place whatever is chosen. */}
          <ul className="flex flex-wrap gap-x-5 gap-y-1" aria-hidden="true">
            <li className="flex items-center gap-2">
              <svg width="16" height="2" className="shrink-0">
                <line x1="0" y1="1" x2="16" y2="1" stroke={TOTAL} strokeWidth="2.5" />
              </svg>
              <span className="label-mono text-ink">{m.contacts_compare_total()}</span>
            </li>
            {contacts.map((contact, index) => (
              <li key={contact.id} className="flex items-center gap-2">
                <svg width="16" height="2" className="shrink-0">
                  <line x1="0" y1="1" x2="16" y2="1" stroke={pastel(index)} strokeWidth="2" />
                </svg>
                <span className="label-mono text-soft">{contact.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          className="w-52"
          aria-label={m.contacts_compare_mode()}
          value={mode}
          onValueChange={(value) => setMode(value as CompareMode)}
        >
          <ToggleGroupItem value="spent">{m.label_expense()}</ToggleGroupItem>
          <ToggleGroupItem value="received">{m.label_income()}</ToggleGroupItem>
          <ToggleGroupItem value="net">{m.label_net()}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ChartContainer
        config={config}
        className="h-56 w-full"
        role="img"
        aria-label={m.contacts_compare_aria({ currency })}
      >
        <LineChart data={points} accessibilityLayer={false} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <YAxis
            // Room for the widest compact label this axis can print ("999,9 mil"), not just "50 mil":
            // a narrower axis paints the first digits outside the frame.
            width={72}
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
          {contacts.map((contact, index) => (
            <Line
              key={contact.id}
              dataKey={contact.id}
              type="monotone"
              stroke={pastel(index)}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: pastel(index), strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
          <Line
            dataKey="total"
            type="monotone"
            stroke={TOTAL}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 3, fill: TOTAL, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>

      {/* The table is the chart's data for screen readers. */}
      <div className="sr-only">
        <table>
          <caption>{m.contacts_compare_caption({ currency })}</caption>
          <thead>
            <tr>
              <th scope="col">{m.history_month()}</th>
              {contacts.map((contact) => (
                <th key={contact.id} scope="col">
                  {contact.name}
                </th>
              ))}
              <th scope="col">{m.contacts_compare_total()}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month}>
                <th scope="row">{point.label}</th>
                {contacts.map((contact) => (
                  <td key={contact.id}>{formatMoney(Number(point[contact.id]), currency)}</td>
                ))}
                <td>{formatMoney(point.total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
