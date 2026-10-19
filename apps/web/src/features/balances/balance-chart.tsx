import { lazy, Suspense } from 'react'
import { cn } from 'cn'
import { Skeleton } from '#/shared/ui/skeleton'
import type { BalanceChartProps } from './balance-chart-graph'

// Recharts is ~344 kB. This boundary keeps it out of the chunk that paints the overview.
const BalanceChartGraph = lazy(() => import('./balance-chart-graph'))

/** Month-end assets and liabilities (or one source's own balance), as a line chart. */
export function BalanceChart({ className, ...props }: BalanceChartProps) {
  return (
    <Suspense fallback={<Skeleton className={cn('h-56 w-full', className)} aria-busy="true" />}>
      <BalanceChartGraph className={className} {...props} />
    </Suspense>
  )
}
