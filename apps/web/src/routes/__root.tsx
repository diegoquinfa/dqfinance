import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'
import { currentLocale } from '#/shared/i18n'
import { Toaster } from '#/shared/ui/sonner'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'DQFinance' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleDocument />
        {children}
        <Toaster />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'middle-right' }}
            plugins={[
              { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
              { name: 'Tanstack Query', render: <ReactQueryDevtoolsPanel /> },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}

// Renders nothing on both server and client, so it cannot cause a hydration mismatch.
function LocaleDocument() {
  useEffect(() => {
    document.documentElement.lang = currentLocale()
    document.documentElement.dataset.locale = currentLocale()
  }, [])
  return null
}
