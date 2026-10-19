import { lazy, Suspense } from 'react'
import { cn } from 'cn'
import { Skeleton } from '#/shared/ui/skeleton'
import type { CounterpartyDetail } from './counterparties-api'

// Recharts is ~344 kB. This boundary keeps it out of the chunk that paints the contact page.
const ContactSpendingChartGraph = lazy(() => import('./contact-spending-chart-graph'))

/** The monthly series of one contact, as a line. */
export function ContactSpendingChart({
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
  return (
    <Suspense fallback={<Skeleton className={cn('h-48 w-full', className)} aria-busy="true" />}>
      <ContactSpendingChartGraph name={name} monthly={monthly} currency={currency} className={className} />
    </Suspense>
  )
}
