import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * One toast stack for the app. The app is dark only, so the theme is fixed; the toast is a raised
 * surface with a hairline border like a dialog: square, no shadow, ink text.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheck aria-hidden />,
        info: <Info aria-hidden />,
        warning: <TriangleAlert aria-hidden />,
        error: <OctagonX aria-hidden />,
        loading: <Loader2 aria-hidden className="animate-spin" />,
      }}
      style={
        {
          fontFamily: 'inherit',
          '--normal-bg': 'var(--raised)',
          '--normal-text': 'var(--ink)',
          '--normal-border': 'var(--line)',
          '--border-radius': '0',
        } as React.CSSProperties
      }
      toastOptions={{ style: { boxShadow: 'none', fontSize: '14px' } }}
      {...props}
    />
  )
}

export { Toaster }
