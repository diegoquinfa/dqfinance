import type * as React from 'react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'

/** `// 01 Label`: the lilac marker opens a block, the text stays muted. */
export function Eyebrow({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('label-mono text-muted-foreground', className)}>
      {index && (
        <span aria-hidden className="mr-2 text-signal">
          // {index}
        </span>
      )}
      {children}
    </p>
  )
}

/** The one h1 of a page, with an optional eyebrow above and actions beside (below on mobile). */
export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow?: React.ReactNode
  title: string
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="grid gap-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
      <div className="grid gap-4 lg:col-span-8">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="type-title font-medium text-ink">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">{actions}</div>}
    </header>
  )
}

/**
 * A block of a page. `rail` puts the label in columns 1-3 and the content in 4-12 on desktop;
 * `stack` keeps the label on top at full width. Space separates sections, never lines.
 */
export function Section({
  index,
  label,
  action,
  layout = 'rail',
  className,
  children,
}: {
  index?: string
  label: string
  action?: React.ReactNode
  layout?: 'rail' | 'stack'
  className?: string
  children: React.ReactNode
}) {
  const rail = layout === 'rail'
  return (
    <section className={cn('grid gap-5 py-8 md:py-12', rail && 'lg:grid-cols-12 lg:gap-x-12', className)}>
      <div className={cn('flex items-baseline justify-between gap-4', rail && 'lg:col-span-3 lg:flex-col lg:justify-start')}>
        <h2>
          <Eyebrow index={index}>{label}</Eyebrow>
        </h2>
        {action}
      </div>
      <div className={cn('min-w-0', rail && 'lg:col-span-9')}>{children}</div>
    </section>
  )
}

/** Hairline rows: a line above every row and one closing the list. Never boxes. */
export const rowsClass = 'divide-y divide-line border-y border-line'

/** Signed-out and first-run screens: the brand, a two-tone statement, and one raised panel. */
export function FocusLayout({ children, logo = true }: { children: React.ReactNode; logo?: boolean }) {
  return (
    <main className={cn('container-page grid min-h-dvh py-6', logo && 'grid-rows-[auto_1fr]')}>
      {logo && <img src="/logo.svg" alt={m.app_name()} className="h-7 w-auto" />}
      <div className="grid content-center gap-10 py-10 lg:grid-cols-12 lg:items-center lg:gap-x-12">
        <p className="type-heading font-medium lg:type-title lg:col-span-6">
          <span className="text-ink">{m.auth_tagline_lead()}</span>{' '}
          <span className="text-muted-foreground">{m.auth_tagline_rest()}</span>
        </p>
        <div className="w-full max-w-lg lg:col-span-6 lg:justify-self-end">{children}</div>
      </div>
    </main>
  )
}
