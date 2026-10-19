import * as React from "react"
import { cn } from "cn"

/** Filled, square field. Shared look with SelectTrigger and ComboboxInput. */
export const fieldClass =
  "h-11 w-full min-w-0 border border-transparent bg-surface px-3 text-base text-ink transition-colors placeholder:text-muted-foreground hover:border-line-strong focus-visible:border-line-strong disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        "selection:bg-signal selection:text-canvas file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
