import type * as React from 'react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'

/** `// 01`: the lilac marker opens a block; the text (when given) stays muted.
 * A span, not a paragraph: it also lives inside the `h2` of a section heading. */
export function Eyebrow({ index, children, className }: { index?: string; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('label-mono block text-muted-foreground', className)}>
      {index && (
        <span aria-hidden className="mr-2 text-signal">
          // {index}
        </span>
      )}
      {children}
    </span>
  )
}

/** The one h1 of a page, with actions beside (below on mobile). */
export function PageHeader({
  title,
  actions,
  children,
}: {
  title: string
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="grid gap-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
      <div className="grid gap-4 lg:col-span-8">
        <h1 className="type-title font-medium text-ink">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">{actions}</div>}
    </header>
  )
}

/**
 * A block of a page. The rail layout puts the label in columns 1-3 and the content in 4-12 on
 * desktop. Space separates sections, never lines.
 * The label is always a two-line heading: the `// 0X` index above it, the label in `type-heading`.
 */
export function Section({
  index,
  label,
  action,
  className,
  children,
}: {
  index: string
  label: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('grid gap-5 py-8 md:py-12 lg:grid-cols-12 lg:gap-x-12', className)}>
      {/* The heading is two lines: on mobile the action sits beside the name, not the index. */}
      <div className="flex items-end justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-start lg:justify-start">
        <h2 className="grid min-w-0 gap-2">
          <Eyebrow index={index} />
          <span className="type-heading font-medium break-words text-ink">{label}</span>
        </h2>
        {action}
      </div>
      <div className="min-w-0 lg:col-span-9">{children}</div>
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
