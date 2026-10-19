import { cva } from 'class-variance-authority'

// Square mono chips. The chosen one inverts to ink, like the segmented control it replaces.
// Kept out of the component files: a non-component export there defeats Fast Refresh.
export const toggleVariants = cva(
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
