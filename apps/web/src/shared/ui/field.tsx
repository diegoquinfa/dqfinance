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
    <ul className="divide-y" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex justify-between py-3">
          <span className="h-4 w-40 animate-pulse rounded bg-muted" />
          <span className="h-4 w-20 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}

/** Centered empty state that says how to start. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
