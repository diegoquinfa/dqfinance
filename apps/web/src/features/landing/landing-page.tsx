import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { currentLocale, localeNames, m, switchLocale, type Locale } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Section, rowsClass } from '#/shared/ui/page'
import { authClient } from '#/features/auth/auth-client'
import { DemoButton } from '#/features/demo/demo-button'

const REPO = 'https://github.com/diegoquinfa/dqfinance'

/** The features, in the order a visitor meets them. */
const FEATURES = [
  { title: m.landing_feature_ledger_title, body: m.landing_feature_ledger_body },
  { title: m.landing_feature_agent_title, body: m.landing_feature_agent_body },
  { title: m.landing_feature_import_title, body: m.landing_feature_import_body },
  { title: m.landing_feature_transfers_title, body: m.landing_feature_transfers_body },
  { title: m.landing_feature_recurring_title, body: m.landing_feature_recurring_body },
  { title: m.landing_feature_calendar_title, body: m.landing_feature_calendar_body },
] as const

/** The screens, as they are. */
const SCREENS = [
  { src: '/screens/overview.png', alt: m.landing_og_image_alt, caption: m.nav_overview },
  { src: '/screens/movements.png', alt: m.nav_transactions, caption: m.nav_transactions },
  { src: '/screens/accounts.png', alt: m.nav_accounts, caption: m.nav_accounts },
] as const

/**
 * The signed-out home: what the app is, what it looks like, and how to try it.
 *
 * It keeps the app's language: near-monochrome, one lilac signal, square corners, hairlines
 * and the numbered sections of the signed-in pages.
 */
export function LandingPage() {
  const year = new Date().getFullYear()
  const navigate = useNavigate()
  // A signed-in visitor goes to the app, as before. The check runs in the browser, so the page
  // can be rendered on the server for the crawlers that read it.
  useEffect(() => {
    void authClient.getSession().then(({ data }) => {
      if (data?.user) void navigate({ to: '/overview' })
    })
  }, [navigate])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <img src="/logo.svg" alt={m.app_name()} className="h-7 w-auto" />
          <div className="flex items-center gap-4">
            <LocaleLinks />
            <Link to="/sign-in" className="label-mono link-draw text-muted-foreground hover:text-ink">
              {m.auth_submit_sign_in()}
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sign-up">{m.auth_submit_sign_up()}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="container-page">
        <section className="grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-x-12">
          <div className="grid gap-8 lg:col-span-8">
            <h1 className="type-display font-medium">
              <span className="text-ink">{m.auth_tagline_lead()}</span>{' '}
              <span className="text-muted-foreground">{m.auth_tagline_rest()}</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">{m.landing_hero_body()}</p>
            <div className="flex flex-wrap items-start gap-3">
              <DemoButton />
              <Button variant="outline" asChild>
                <Link to="/sign-up">{m.auth_submit_sign_up()}</Link>
              </Button>
            </div>
          </div>
        </section>

        <Section index="01" label={m.landing_section_features()}>
          <ul className={rowsClass}>
            {FEATURES.map((feature) => (
              <li key={feature.title.name} className="grid gap-2 py-6 md:grid-cols-12 md:gap-x-12">
                <h3 className="type-heading-sm font-medium text-ink md:col-span-5">{feature.title()}</h3>
                <p className="text-sm text-muted-foreground md:col-span-7">{feature.body()}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section index="02" label={m.landing_section_screens()}>
          <div className="grid gap-6">
            <p className="max-w-2xl text-sm text-muted-foreground">{m.landing_screens_body()}</p>
            <div className="grid gap-6 lg:grid-cols-2">
              {SCREENS.map((screen) => (
                <figure key={screen.src} className="grid gap-2">
                  <img src={screen.src} alt={screen.alt()} className="w-full border border-line" loading="lazy" />
                  <figcaption className="label-mono text-faint">{screen.caption()}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Section>

        <Section index="03" label={m.landing_section_agent()}>
          <div className="grid gap-6">
            <p className="max-w-2xl text-sm text-muted-foreground">{m.landing_agent_body()}</p>
            <p className="max-w-2xl text-sm text-muted-foreground">{m.landing_agent_note()}</p>
            <a href={`${REPO}#connect-an-agent`} className="label-mono link-draw w-fit text-ink">
              {m.landing_footer_repo()}
            </a>
          </div>
        </Section>
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-10">
          <div className="grid gap-3">
            <img src="/logo.svg" alt={m.app_name()} className="h-5 w-auto" />
            <p className="label-mono text-faint">{m.landing_footer_rights({ year: String(year) })}</p>
          </div>
          <nav aria-label={m.landing_footer_repo()} className="flex flex-wrap gap-6">
            <a href={REPO} className="label-mono link-draw text-muted-foreground hover:text-ink">
              {m.landing_footer_repo()}
            </a>
            <a href={`${REPO}#readme`} className="label-mono link-draw text-muted-foreground hover:text-ink">
              README
            </a>
            <a href={`${REPO}/blob/main/LICENSE`} className="label-mono link-draw text-muted-foreground hover:text-ink">
              {m.landing_footer_license()}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/** The language, as two mono codes. Switching reloads the page, like the picker in the app. */
function LocaleLinks() {
  const locale = currentLocale()
  return (
    <div className="flex items-center gap-3">
      {Object.entries(localeNames).map(([code]) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code as Locale)}
          className={cn(
            'label-mono',
            code === locale ? 'text-ink' : 'text-muted-foreground hover:text-ink',
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
