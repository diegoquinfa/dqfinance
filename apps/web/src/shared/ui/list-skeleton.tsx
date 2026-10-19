import { rowsClass } from '#/shared/ui/page'
import { Skeleton } from '#/shared/ui/skeleton'

/** Skeleton rows shaped like the hairline list they replace. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className={rowsClass} aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex justify-between py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  )
}
