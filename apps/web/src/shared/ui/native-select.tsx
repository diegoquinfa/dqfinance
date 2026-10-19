import * as React from 'react'
import { cn } from 'cn'
import { ChevronDown } from 'lucide-react'

/** Native select styled like Input. Used for short fixed lists, where the platform picker is better. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 pr-8 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-2.5 right-2.5 size-4 text-muted-foreground" />
    </div>
  )
}

export { NativeSelect }
