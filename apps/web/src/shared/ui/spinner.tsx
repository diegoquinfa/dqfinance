import { cn } from 'cn'
import { Loader2 } from 'lucide-react'

/** Marks a pending control. The button keeps its label, so the icon stays hidden from readers. */
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return <Loader2 aria-hidden className={cn('size-4 animate-spin', className)} {...props} />
}

export { Spinner }
