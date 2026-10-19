import type * as React from 'react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/shared/ui/dialog'

/**
 * Dialog with a trigger button. `children` is a function so the form can close the dialog
 * once it saved, without every screen repeating open/close state.
 */
export function DialogPanel({
  trigger,
  title,
  description,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  trigger: React.ReactNode
  title: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: (close: () => void) => React.ReactNode
}) {
  const [uncontrolled, setUncontrolled] = useState(false)
  const open = controlledOpen ?? uncontrolled
  const setOpen = onOpenChange ?? setUncontrolled
  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children(close)}
      </DialogContent>
    </Dialog>
  )
}
