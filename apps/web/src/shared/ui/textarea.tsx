import * as React from "react"
import { cn } from "cn"

// Filled surface, square, like Input; it grows with what is typed.

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-32 w-full border border-transparent bg-surface px-3 py-2 font-mono text-sm text-ink transition-colors placeholder:text-muted-foreground hover:border-line-strong focus-visible:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
