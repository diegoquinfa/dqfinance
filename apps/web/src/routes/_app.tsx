import { Link, Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import { House, Landmark, Plus, ReceiptText, Repeat, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import type { Locale } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useSettings } from '#/features/settings/settings-api'
import { usePushUpdates } from '#/features/settings/push-api'
import { NewTransactionDialog } from '#/features/transactions/new-transaction-dialog'
import { ApiError } from '#/shared/api'
import { currentLocale, m, switchLocale } from '#/shared/i18n'
import { Avatar, AvatarFallback } from '#/shared/ui/avatar'
import { Button } from '#/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/shared/ui/dropdown-menu'

// Shell + guard for every signed-in page. The session lives on the API origin, so it is checked client-side.
export const Route = createFileRoute('/_app')({
  ssr: false,
  component: AppLayout,
})

const links = [
  { to: '/overview', label: m.nav_overview },
  { to: '/transactions', label: m.nav_transactions },
  { to: '/accounts', label: m.nav_accounts },
  { to: '/transfers', label: m.nav_transfers },
  { to: '/recurring', label: m.nav_recurring },
  { to: '/contacts', label: m.nav_contacts },
  { to: '/settings', label: m.nav_settings },
] as const

// The four destinations people open daily; the rest live in the menu.
const tabs = [
  { to: '/overview', label: m.nav_overview, icon: House },
  { to: '/transactions', label: m.nav_transactions, icon: ReceiptText },
  { to: '/accounts', label: m.nav_accounts, icon: Landmark },
  { to: '/recurring', label: m.nav_recurring, icon: Repeat },
] as const

// The menu carries what has no tab: importing a statement is a task, not a destination.
const menuLinks = [...links, { to: '/transactions/import', label: m.transactions_import }] as const

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
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <Link to="/overview" className="label-mono text-ink">
            {m.app_name()}
          </Link>
          <nav aria-label={m.nav_main()} className="hidden xl:block">
            <ul className="flex gap-6">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="label-mono link-draw py-1 text-muted-foreground hover:text-ink data-[status=active]:text-ink"
                  >
                    {link.label()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <NewTransactionDialog
              trigger={
                <Button size="sm" className="hidden lg:inline-flex">
                  <Plus aria-hidden />
                  {m.transactions_new()}
                </Button>
              }
            />
            <MenuDialog name={session.user.name} email={session.user.email} />
            <ProfileMenu name={session.user.name} email={session.user.email} />
          </div>
        </div>
      </header>

      <main id="main" className="container-page pb-32 lg:pb-24">
        <Outlet />
      </main>

      <nav
        aria-label={m.nav_main()}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="relative flex h-full items-center justify-center text-muted-foreground transition-colors before:absolute before:top-0 before:h-px before:w-8 before:bg-signal before:opacity-0 hover:text-ink data-[status=active]:text-ink data-[status=active]:before:opacity-100"
              >
                <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                <span className="sr-only">{label()}</span>
              </Link>
            </li>
          ))}
          <li className="p-2">
            <NewTransactionDialog
              trigger={
                <button
                  type="button"
                  className="flex size-full items-center justify-center bg-ink text-canvas transition-colors hover:bg-signal"
                >
                  <Plus aria-hidden className="size-5" />
                  <span className="sr-only">{m.transactions_new()}</span>
                </button>
              }
            />
          </li>
        </ul>
      </nav>
    </div>
  )
}

/** Full-screen menu with large numbered links, below the xl breakpoint. */
function MenuDialog({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className="label-mono link-draw h-9 text-ink xl:hidden">{m.nav_menu()}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-canvas duration-500 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div className="container-page flex h-16 shrink-0 items-center justify-between border-b border-line">
            <DialogPrimitive.Title className="label-mono text-ink">{m.app_name()}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{m.nav_menu()}</DialogPrimitive.Description>
            <DialogPrimitive.Close className="inline-flex size-9 items-center justify-center text-muted-foreground hover:text-ink">
              <X aria-hidden className="size-5" />
              <span className="sr-only">{m.action_close()}</span>
            </DialogPrimitive.Close>
          </div>
          <nav aria-label={m.nav_main()} className="container-page flex-1 overflow-y-auto py-6">
            <ul className="divide-y divide-line border-y border-line">
              {menuLinks.map((link, index) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-5 py-4 text-muted-foreground transition-colors hover:text-ink data-[status=active]:text-ink"
                  >
                    <span aria-hidden className="label-mono text-faint group-data-[status=active]:text-signal">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="type-heading transition-transform duration-500 group-hover:translate-x-2">
                      {link.label()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="container-page flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-line py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="grid gap-1">
              <p className="label-mono truncate text-ink">{name}</p>
              <p className="label-mono truncate text-muted-foreground">{email}</p>
            </div>
            <button type="button" className="label-mono link-draw text-ink" onClick={() => void authClient.signOut()}>
              {m.action_sign_out()}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** "Ada Lovelace" to "AL"; the email is the fallback when the provider gave no name. */
function initials(name: string, email: string) {
  return (name || email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/** From xl up the account is the avatar: name, Settings, Sign out. Below, the full-screen menu. */
function ProfileMenu({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden text-muted-foreground transition-colors hover:text-ink xl:block"
        >
          <Avatar className="size-9">
            <AvatarFallback>{initials(name, email)}</AvatarFallback>
          </Avatar>
          <span className="sr-only">{m.nav_profile()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-1">
          <span className="truncate text-ink">{name}</span>
          <span className="truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/settings">{m.nav_settings()}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => void authClient.signOut()}>
            {m.action_sign_out()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
