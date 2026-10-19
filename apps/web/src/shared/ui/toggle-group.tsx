import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { toggleVariants } from '#/shared/ui/toggle-variants'

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
  variant: 'default',
})

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root>

function ToggleGroup({ className, variant, size, onValueChange, children, ...props }: ToggleGroupProps & VariantProps<typeof toggleVariants>) {
  // A single-select group stands in for a radio set: dropping the value of a second click would leave
  // the screen without a state, so the empty value is ignored.
  const handleValueChange = (value: string | string[]) => {
    if (value === '') return
    onValueChange?.(value as never)
  }

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn('flex w-fit items-center border border-line', className)}
      onValueChange={handleValueChange}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({ className, children, variant, size, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(toggleVariants({ variant: context.variant || variant, size: context.size || size }), 'min-w-0 grow', className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
