import { useEffect, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'
import { useInView, useReducedMotion } from './motion'

const STEPS: { title: () => string; art: (on: boolean) => ReactNode }[] = [
  {
    title: m.landing_connect_server_title,
    art: (on) => (
      <span className="label-mono flex w-fit items-center border border-line-strong px-3 py-2 normal-case tracking-normal text-soft">
        {/* The address types itself in: a cover in the page's color shrinks off it in steps. */}
        <span className="relative whitespace-nowrap">
          https://…/mcp
          <span
            className={cn(
              'absolute inset-0 origin-right bg-canvas transition-transform duration-[1200ms] ease-[steps(13)]',
              on ? 'scale-x-0' : 'scale-x-100',
            )}
          />
        </span>
        <span className="animate-blink ml-0.5 inline-block h-3 w-px bg-signal" />
      </span>
    ),
  },
  {
    title: m.landing_connect_consent_title,
    art: (on) => (
      <span className="grid gap-2">
        {[m.consent_scope_finance_read, m.consent_scope_finance_write].map((scope, index) => (
          <span key={scope.name} className="flex items-center gap-2 text-sm text-soft">
            <span
              className={cn(
                'grid size-4 shrink-0 place-items-center border transition-colors duration-300',
                on ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-transparent',
              )}
              style={{ transitionDelay: on ? `${300 + index * 350}ms` : '0ms' }}
            >
              <Check aria-hidden className="size-3" />
            </span>
            {scope()}
          </span>
        ))}
      </span>
    ),
  },
  {
    title: m.landing_connect_ask_title,
    art: (on) => (
      <span className="label-mono flex items-center gap-2 text-muted-foreground">
        <span className={cn('size-1.5 rounded-full transition-colors duration-500', on ? 'bg-income' : 'bg-faint')} />
        {m.landing_chat_status()}
      </span>
    ),
  },
]

/**
 * The three steps of connecting an assistant, as a timeline that plays: a lilac node walks down the
 * line, and each step it reaches shows what happens there (the address typed in, the permissions
 * granted, the connection). It loops while on screen; with reduced motion every step shows at once.
 */
export function ConnectSteps() {
  const [ref, inView] = useInView<HTMLOListElement>()
  const reduced = useReducedMotion()
  // How many steps are reached; one past the last holds the finished state before starting over.
  const [reached, setReached] = useState(0)
  const shown = reduced ? STEPS.length : reached

  useEffect(() => {
    if (!inView || reduced) return
    const timer = setTimeout(
      () => setReached((current) => (current > STEPS.length ? 0 : current + 1)),
      reached === 0 ? 400 : reached > STEPS.length ? 3500 : 1900,
    )
    return () => clearTimeout(timer)
  }, [inView, reduced, reached])

  return (
    <ol ref={ref} className="grid">
      {STEPS.map((step, index) => {
        const on = index < shown
        return (
          <li key={step.title.name} className="grid grid-cols-[1.5rem_1fr] gap-x-4">
            {/* The node, and the line down to the next one, which fills once this step is done. */}
            <span className="relative flex justify-center">
              <span
                className={cn(
                  'relative z-10 mt-1.5 size-2.5 border transition-colors duration-500',
                  on ? 'border-signal bg-signal' : 'border-line-strong bg-canvas',
                )}
              />
              {index < STEPS.length - 1 && (
                <span className="absolute top-4 bottom-0 w-px bg-line">
                  <span
                    className={cn(
                      'absolute inset-0 origin-top bg-signal transition-transform duration-[1500ms] ease-[var(--ease-out-expo)]',
                      index < shown - 1 ? 'scale-y-100' : 'scale-y-0',
                    )}
                  />
                </span>
              )}
            </span>
            <span className="grid content-start gap-3 pb-8">
              <span className="flex items-baseline gap-3">
                <span className={cn('label-mono transition-colors duration-500', on ? 'text-signal' : 'text-faint')}>
                  0{index + 1}
                </span>
                <span className={cn('text-base transition-colors duration-500', on ? 'text-ink' : 'text-muted-foreground')}>
                  {step.title()}
                </span>
              </span>
              <span className={cn('transition-opacity duration-500', on ? 'opacity-100' : 'opacity-40')}>{step.art(on)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
