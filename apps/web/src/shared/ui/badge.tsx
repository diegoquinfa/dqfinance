import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Mono tag with a hairline border, like the stack chips of the portfolio.
const badgeVariants = cva(
  "label-mono inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border px-1.5 py-0.5 whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-ink text-ink",
        secondary: "border-line-strong text-soft",
        destructive: "border-destructive text-destructive",
        outline: "border-line-strong text-muted-foreground",
        ghost: "border-transparent text-muted-foreground",
        link: "border-transparent text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
