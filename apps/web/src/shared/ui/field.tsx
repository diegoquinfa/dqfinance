import type * as React from 'react'
import { cn } from 'cn'
import { Label } from '#/shared/ui/label'

/** Label above, control, helper or error below. The only layout forms use. */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

/** Inline error message for a form-level failure (not tied to one field). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

/** Skeleton rows shaped like the list they replace. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line border-y border-line" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex justify-between py-4">
          <span className="h-4 w-40 animate-pulse bg-surface" />
          <span className="h-4 w-20 animate-pulse bg-surface" />
        </li>
      ))}
    </ul>
  )
}

/** Empty state that says how to start. Left aligned, like every block of content. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-y border-line py-10">
      <p className="type-heading-sm text-ink">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
