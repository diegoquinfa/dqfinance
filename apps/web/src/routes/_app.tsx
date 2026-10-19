import { Link, Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { Locale } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useSettings } from '#/features/settings/settings-api'
import { usePushUpdates } from '#/features/settings/push-api'
import { ApiError } from '#/shared/api'
import { currentLocale, m, switchLocale } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'

// Shell + guard for every signed-in page. The session lives on the API origin, so it is checked client-side.
export const Route = createFileRoute('/_app')({
  ssr: false,
  component: AppLayout,
})

const links = [
  { to: '/overview', label: m.nav_overview },
  { to: '/transactions', label: m.nav_transactions },
  { to: '/transfers', label: m.nav_transfers },
  { to: '/accounts', label: m.nav_accounts },
  { to: '/contacts', label: m.nav_contacts },
  { to: '/recurring', label: m.nav_recurring },
  { to: '/settings', label: m.nav_settings },
] as const

function AppLayout() {
  const { data: session, isPending } = authClient.useSession()
  const settings = useSettings({ enabled: Boolean(session) })
  usePushUpdates(Boolean(session))

  // The user's saved language wins over the browser's, once per change.
  useEffect(() => {
    if (settings.data && settings.data.locale !== currentLocale()) switchLocale(settings.data.locale as Locale)
  }, [settings.data])

  if (isPending || (session && settings.isPending)) return <div className="min-h-dvh" aria-busy="true" />
  if (!session) return <Navigate to="/sign-in" />
  if (settings.error instanceof ApiError && settings.error.status === 401) return <Navigate to="/sign-in" />
  // Only decide "needs onboarding" once the answer is settled: right after onboarding the cache still
  // holds the previous null while the invalidation refetches.
  if (!settings.isPending && !settings.isFetching && !settings.data) return <Navigate to="/onboarding" />

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/overview" className="font-semibold tracking-tight">
            {m.app_name()}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {m.auth_signed_in_as({ email: session.user.email })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => void authClient.signOut()}>
              {m.action_sign_out()}
            </Button>
          </div>
        </div>
        <nav aria-label={m.app_name()} className="mx-auto max-w-5xl overflow-x-auto px-4">
          <ul className="flex gap-4 text-sm whitespace-nowrap">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block border-b-2 border-transparent py-2 text-muted-foreground hover:text-foreground"
                  activeProps={{ className: 'block border-b-2 border-primary py-2 text-foreground font-medium' }}
                >
                  {link.label()}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
