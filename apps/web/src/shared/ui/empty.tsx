import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// Empty states sit in the place of a list: left aligned, hairlines above and below, like a section.

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn('flex min-w-0 flex-1 flex-col items-start justify-center gap-2 border-y border-line py-10', className)}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-header" className={cn('flex max-w-md flex-col items-start gap-2', className)} {...props} />
}

const emptyMediaVariants = cva('flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0', {
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: 'size-10 bg-surface text-ink [&_svg:not([class*="size-"])]:size-6',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function EmptyMedia({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return <div data-slot="empty-icon" data-variant={variant} className={cn(emptyMediaVariants({ variant, className }))} {...props} />
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-title" className={cn('type-heading-sm font-medium text-ink', className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn('text-sm text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-ink', className)}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-content" className={cn('mt-2 flex w-full min-w-0 flex-col items-start gap-4 text-sm', className)} {...props} />
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
