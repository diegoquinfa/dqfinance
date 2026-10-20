import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'
import { currentLocale, m } from '#/shared/i18n'
import { requestOrigin } from '#/shared/request-origin'
import { Toaster } from '#/shared/ui/sonner'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async () => ({ origin: await requestOrigin() }),
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? ''
    const image = `${origin}/og.png`
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0a0a0a' },
        { title: m.landing_meta_title() },
        { name: 'description', content: m.landing_meta_description() },
        { property: 'og:site_name', content: m.app_name() },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: m.landing_meta_title() },
        { property: 'og:description', content: m.landing_meta_description() },
        { property: 'og:image', content: image },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: m.landing_og_image_alt() },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: m.landing_meta_title() },
        { name: 'twitter:description', content: m.landing_meta_description() },
        { name: 'twitter:image', content: image },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    }
  },
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
