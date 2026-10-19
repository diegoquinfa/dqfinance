import * as React from 'react'
import { cn } from 'cn'
import { ChevronDown } from 'lucide-react'
import { fieldClass } from '#/shared/ui/input'

/** Native select styled like Input. Used for short fixed lists, where the platform picker is better. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative" data-slot="native-select-wrapper">
      <select data-slot="native-select" className={cn(fieldClass, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        data-slot="native-select-icon"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
