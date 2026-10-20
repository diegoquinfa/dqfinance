import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDown } from 'lucide-react'
import { cn } from 'cn'
import { currentLocale, localeNames, m, switchLocale, type Locale } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Section } from '#/shared/ui/page'
import { authClient } from '#/features/auth/auth-client'
import { DemoButton } from '#/features/demo/demo-button'
import { AgentChat } from './agent-chat'
import { ConnectSteps } from './connect-steps'
import { FeatureGrid } from './feature-grid'
import { LedgerField } from './ledger-field'
import { LiveLedger } from './live-ledger'
import { OpenSource, REPO } from './open-source'
import { Reveal, RisingWords } from './motion'
import { ScreensShowcase } from './screens-showcase'
import { ScrollStatement } from './scroll-statement'

/**
 * The signed-out home: what the app is, how it works, what an assistant does with it, and how to
 * try it.
 *
 * It keeps the app's language (near-monochrome, one lilac signal, square corners, hairlines, the
 * numbered sections) but it is the one page allowed to perform: a living grid behind the hero, a
 * ledger that recomputes, a conversation that plays, and sections that rise as they arrive.
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
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <img src="/logo.svg" alt={m.app_name()} className="h-7 w-auto" />
          <div className="flex items-center gap-4">
            <LocaleLinks />
            <Link to="/sign-in" className="label-mono link-draw text-muted-foreground hover:text-ink max-sm:hidden">
              {m.auth_submit_sign_in()}
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sign-up">{m.auth_submit_sign_up()}</Link>
            </Button>
          </div>
        </div>
        <span aria-hidden className="scroll-progress absolute inset-x-0 -bottom-px h-px bg-signal" />
      </header>

      <main id="main">
        <section className="relative">
          <LedgerField />
          <div className="container-page relative grid min-h-[calc(100dvh-4rem)] content-center gap-12 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-x-12">
            <div className="grid gap-8 lg:col-span-7">
              <span className="label-mono animate-rise text-muted-foreground">
                <span aria-hidden className="mr-2 text-signal">
                  //
                </span>
                {m.landing_hero_eyebrow()}
              </span>
              <h1 className="type-display font-medium">
                <RisingWords text={m.auth_tagline_lead()} className="text-ink" delay={150} />
                <RisingWords text={m.auth_tagline_rest()} className="text-muted-foreground" delay={350} />
              </h1>
              <p className="animate-rise max-w-xl text-base text-muted-foreground" style={{ animationDelay: '700ms' }}>
                {m.landing_hero_body()}
              </p>
              <div className="animate-rise flex flex-wrap items-start gap-3" style={{ animationDelay: '850ms' }}>
                <DemoButton />
                <Button variant="outline" asChild>
                  <Link to="/sign-up">{m.auth_submit_sign_up()}</Link>
                </Button>
              </div>
            </div>
            <div className="animate-rise lg:col-span-5" style={{ animationDelay: '500ms' }}>
              <LiveLedger />
            </div>
            <a
              href="#how"
              className="label-mono animate-rise flex w-fit items-center gap-2 text-muted-foreground hover:text-ink max-lg:hidden lg:col-span-12" style={{ animationDelay: '1200ms' }}
            >
              <ArrowDown aria-hidden className="size-3.5 animate-bounce" />
              {m.landing_hero_scroll()}
            </a>
          </div>
        </section>

        <div className="container-page">
          <div id="how" className="scroll-mt-16">
            <Section index="01" label={m.landing_section_how()}>
              <ScrollStatement text={m.landing_how_statement()} />
            </Section>
          </div>

          <Section index="02" label={m.landing_section_agent()}>
            <div className="grid grid-cols-1 gap-12 xl:grid-cols-9 xl:gap-x-12">
              <Reveal className="xl:col-span-5">
                <AgentChat />
              </Reveal>
              <div className="grid content-start gap-10 xl:col-span-4">
                <Reveal className="grid gap-4">
                  <h3 className="type-heading font-medium">
                    <span className="text-ink">{m.landing_agent_lead()}</span>{' '}
                    <span className="text-muted-foreground">{m.landing_agent_rest()}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">{m.landing_agent_body()}</p>
                </Reveal>
                <ConnectSteps />
                <Reveal className="grid gap-3">
                  <p className="text-sm text-muted-foreground">{m.landing_agent_note()}</p>
                  <a href={`${REPO}#connect-an-agent`} className="label-mono link-draw w-fit text-ink">
                    {m.landing_agent_guide()} →
                  </a>
                </Reveal>
              </div>
            </div>
          </Section>

          <Section index="03" label={m.landing_section_features()}>
            <FeatureGrid />
          </Section>

          {/* The heading pins beside the screens while they follow the scroll (Section's rail is its first child). */}
          <Section
            index="04"
            label={m.landing_section_screens()}
            className="lg:[&>div:first-child]:sticky lg:[&>div:first-child]:top-[calc(50vh-10rem)] lg:[&>div:first-child]:self-start"
          >
            <Reveal className="grid gap-8">
              <p className="max-w-2xl text-sm text-muted-foreground">{m.landing_screens_body()}</p>
              <ScreensShowcase />
            </Reveal>
          </Section>

          <Section index="05" label={m.landing_section_open()}>
            <OpenSource />
          </Section>
        </div>

        <section className="relative mt-12 border-t border-line">
          <LedgerField className="[mask-image:linear-gradient(to_top,black_30%,transparent)]" />
          <div className="container-page relative grid gap-8 py-24 md:py-36">
            <Reveal className="grid max-w-4xl gap-8">
              <h2 className="type-display font-medium">
                <span className="text-ink">{m.landing_final_lead()}</span>{' '}
                <span className="text-muted-foreground">{m.landing_final_rest()}</span>
              </h2>
              <p className="max-w-xl text-base text-muted-foreground">{m.landing_final_body()}</p>
              <div className="flex flex-wrap items-start gap-3">
                <DemoButton />
                <Button variant="outline" asChild>
                  <Link to="/sign-up">{m.auth_submit_sign_up()}</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-10">
          <div className="grid gap-3">
            <img src="/logo.svg" alt={m.app_name()} className="h-7 w-auto" />
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
          className={cn('label-mono', code === locale ? 'text-ink' : 'text-muted-foreground hover:text-ink')}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
