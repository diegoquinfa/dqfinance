import * as React from 'react'
import { cn } from 'cn'
import type { TooltipValueType } from 'recharts'
import * as RechartsPrimitive from 'recharts'

const INITIAL_DIMENSION = { width: 320, height: 200 } as const
type TooltipNameType = number | string

/** One entry per series: its legend/tooltip label and the token its line or swatch paints with. */
export type ChartConfig = Record<string, { label?: React.ReactNode }>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

/** The frame Recharts draws in: square, token colors, mono ticks. Callers set the height. */
function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
  initialDimension?: { width: number; height: number }
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          'flex justify-center [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-curve.recharts-tooltip-cursor]:stroke-line [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden',
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

/** Square hairline tooltip: the series label, then the value the caller formats. */
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
  } & Omit<RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>, 'accessibilityLayer'>) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null
    const [item] = payload
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : itemConfig?.label
    if (labelFormatter) return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>
    if (!value) return null
    return <div className={cn('font-medium', labelClassName)}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!active || !payload?.length) return null

  const nestLabel = payload.length === 1 && indicator !== 'dot'

  return (
    <div
      className={cn(
        'grid min-w-[8rem] items-start gap-1.5 border border-line bg-raised px-2.5 py-1.5 text-sm',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color ?? item.payload?.fill ?? item.color
            return (
              <div key={index} className="flex w-full flex-wrap items-stretch gap-2">
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {!hideIndicator && (
                      <div
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 border border-(--color-border) bg-(--color-bg)"
                        style={{ '--color-bg': indicatorColor, '--color-border': indicatorColor } as React.CSSProperties}
                      />
                    )}
                    <div className="flex flex-1 items-baseline justify-between gap-4 leading-none">
                      <span className="label-mono text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                      {item.value != null && (
                        <span className="font-medium text-ink tabular-nums">
                          {typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

/** Helper to extract item config from a payload. */
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) return undefined
  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined
  let configLabelKey: string = key
  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
  }
  return configLabelKey in config ? config[configLabelKey] : config[key]
}

const ChartTooltip = RechartsPrimitive.Tooltip

export { ChartContainer, ChartTooltip, ChartTooltipContent }
