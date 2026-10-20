import { useEffect, useState } from 'react'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Reveal, useInView, useReducedMotion } from './motion'

export const REPO = 'https://github.com/diegoquinfa/dqfinance'
const DEPLOY = `https://deploy.workers.cloudflare.com/?url=${REPO}`

/** The deploy by hand, as the README has it. Commands, so they read the same in every language. */
const LINES = [
  { command: true, text: 'git clone github.com/diegoquinfa/dqfinance && cd dqfinance' },
  { command: true, text: 'pnpm install' },
  { command: true, text: 'wrangler d1 create dqfinance-db' },
  { command: true, text: 'wrangler secret put BETTER_AUTH_SECRET' },
  { command: true, text: 'pnpm build && pnpm run deploy' },
  { command: false, text: '✓ https://dqfinance.<account>.workers.dev' },
] as const

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A terminal that types the deploy, line by line, while it is on screen. */
function DeployTerminal() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [state, setState] = useState({ done: 0, partial: '' })
  const done = reduced ? LINES.length : state.done

  useEffect(() => {
    if (!inView || reduced) return
    let cancelled = false
    async function play() {
      while (!cancelled) {
        setState({ done: 0, partial: '' })
        await sleep(600)
        for (let index = 0; index < LINES.length && !cancelled; index++) {
          const line = LINES[index]
          if (line.command)
            for (let end = 1; end <= line.text.length && !cancelled; end++) {
              setState({ done: index, partial: line.text.slice(0, end) })
              await sleep(18 + Math.random() * 30)
            }
          if (!cancelled) setState({ done: index + 1, partial: '' })
          await sleep(line.command ? 500 : 0)
        }
        await sleep(4500)
      }
    }
    void play()
    return () => {
      cancelled = true
    }
  }, [inView, reduced])

  const typing = !reduced && done < LINES.length ? LINES[done] : undefined

  return (
    <div ref={ref} className="grid border border-line bg-raised">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 bg-line-strong" />
          <span className="size-2 bg-line-strong" />
          <span className="size-2 bg-line-strong" />
        </span>
        <span className="label-mono text-muted-foreground">{m.landing_open_terminal()}</span>
      </div>
      <pre className="label-mono grid h-64 content-start gap-2 overflow-hidden px-5 py-5 leading-relaxed tracking-normal normal-case whitespace-pre-wrap break-all">
        {LINES.slice(0, done).map((line) => (
          <Line key={line.text} line={line} text={line.text} />
        ))}
        {typing && (
          <span>
            <span className="text-signal">$ </span>
            <span className="text-ink">{state.partial}</span>
            <span className="animate-blink ml-px inline-block h-3.5 w-px translate-y-0.5 bg-signal" />
          </span>
        )}
      </pre>
    </div>
  )
}

function Line({ line, text }: { line: (typeof LINES)[number]; text: string }) {
  if (!line.command) return <span className="animate-rise text-income">{text}</span>
  return (
    <span>
      <span className="text-signal">$ </span>
      <span className="text-soft">{text}</span>
    </span>
  )
}

/** Open source, and yours to run: the pitch, the stack, the two ways in, and the deploy playing. */
export function OpenSource() {
  return (
    <div className="grid grid-cols-1 gap-12 xl:grid-cols-9 xl:gap-x-12">
      <Reveal className="grid content-start gap-8 xl:col-span-4">
        <h3 className="type-heading font-medium">
          <span className="text-ink">{m.landing_open_lead()}</span>{' '}
          <span className="text-muted-foreground">{m.landing_open_rest()}</span>
        </h3>
        <p className="text-sm text-muted-foreground">{m.landing_open_body()}</p>
        <div className="flex flex-wrap gap-2">
          {['Workers', 'D1', 'R2', 'MCP', 'OAuth 2.1'].map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Button variant="outline" asChild>
            <a href={DEPLOY}>{m.landing_open_deploy()}</a>
          </Button>
          <a href={REPO} className="label-mono link-draw text-ink">
            {m.landing_open_code()} →
          </a>
        </div>
      </Reveal>
      <Reveal delay={150} className="xl:col-span-5">
        <DeployTerminal />
      </Reveal>
    </div>
  )
}
