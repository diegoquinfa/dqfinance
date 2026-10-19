import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Toggle as TogglePrimitive } from 'radix-ui'

// Square mono chips. The chosen one inverts to ink, like the segmented control it replaces.
const toggleVariants = cva(
  'label-mono inline-flex items-center justify-center gap-2 whitespace-nowrap text-muted-foreground transition-colors duration-300 hover:text-ink disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-ink data-[state=on]:text-canvas data-[state=on]:hover:text-canvas [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-line-strong bg-transparent',
      },
      size: {
        default: 'h-10 min-w-10 px-3',
        sm: 'h-8 min-w-8 px-2',
        lg: 'h-11 min-w-11 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({ className, variant, size, ...props }: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
}

export { Toggle, toggleVariants }
