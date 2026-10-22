import { lazy, Suspense } from 'react'
import { cn } from 'cn'
import { Skeleton } from '#/shared/ui/skeleton'

// Recharts is ~344 kB. This boundary keeps it out of the chunk that paints the overview.
const ForecastChartGraph = lazy(() => import('./forecast-chart-graph'))

/** The projected balance, day by day, until the end of the month. */
export function ForecastChart({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Skeleton className={cn('h-56 w-full', className)} aria-busy="true" />}>
      <ForecastChartGraph className={className} />
    </Suspense>
  )
}
