import { Link } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesColumn,
  FileUp,
  House,
  Landmark,
  PiggyBank,
  ReceiptText,
  Repeat,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'
import { m } from '#/shared/i18n'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from '#/shared/ui/sidebar'

/** Every destination, in the order the app expects to be read. */
const links = [
  { to: '/overview', label: m.nav_overview, icon: House },
  { to: '/transactions', label: m.nav_transactions, icon: ReceiptText },
  { to: '/transactions/import', label: m.transactions_import, icon: FileUp },
  { to: '/accounts', label: m.nav_accounts, icon: Landmark },
  { to: '/transfers', label: m.nav_transfers, icon: ArrowLeftRight },
  { to: '/recurring', label: m.nav_recurring, icon: Repeat },
  { to: '/calendar', label: m.nav_calendar, icon: CalendarDays },
  { to: '/savings', label: m.nav_savings, icon: PiggyBank },
  { to: '/incomes', label: m.nav_incomes, icon: TrendingUp },
  { to: '/budgets', label: m.nav_budgets, icon: ChartNoAxesColumn },
  { to: '/contacts', label: m.nav_contacts, icon: Users },
  { to: '/settings', label: m.nav_settings, icon: Settings },
] as const

/**
 * The desktop rail: every destination with its mono label, collapsible to icons.
 * Below `xl` the shell keeps the top bar and the bottom bar, so this never renders.
 */
export function AppSidebar() {
  return (
    <nav aria-label={m.nav_main()}>
      <Sidebar collapsible="icon" className="border-r border-line">
        <SidebarHeader className="h-16 shrink-0 flex-row items-center border-b border-line px-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <Link to="/overview" aria-label={m.app_name()} className="flex items-center">
            <img src="/logo.svg" alt={m.app_name()} className="h-7 w-auto group-data-[collapsible=icon]:hidden" />
            <img src="/logo-mark.svg" alt="" aria-hidden className="hidden h-7 w-auto group-data-[collapsible=icon]:block" />
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3 py-4">
            <SidebarMenu className="gap-0.5">
              {links.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild tooltip={label()} className="h-9 px-2 text-muted-foreground">
                    <Link
                      to={to}
                      className="relative before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-signal before:opacity-0 data-[status=active]:text-ink data-[status=active]:before:opacity-100"
                    >
                      <Icon aria-hidden strokeWidth={1.5} />
                      <span className="label-mono group-data-[collapsible=icon]:sr-only">{label()}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-line p-3 group-data-[collapsible=icon]:p-2">
          <SidebarTrigger label={m.nav_toggle_sidebar()} className="text-muted-foreground hover:text-ink" />
        </SidebarFooter>
        <SidebarRail label={m.nav_toggle_sidebar()} />
      </Sidebar>
    </nav>
  )
}
