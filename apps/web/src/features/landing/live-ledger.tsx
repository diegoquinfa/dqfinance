import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'
import { formatMoney, formatSignedAmount } from '#/shared/money'
import { rowsClass } from '#/shared/ui/page'
import { useInView, useReducedMotion, useTweened } from './motion'

/** The demo's currency, so the landing and the demo tell the same story. */
const CURRENCY = 'USD'
const OPENING_CENTS = 184_250

const MOVES = [
  { description: m.demo_desc_salary, party: m.demo_contact_employer, type: 'income', cents: 320_000 },
  { description: m.demo_desc_rent, party: m.demo_contact_landlord, type: 'expense', cents: 120_000 },
  { description: m.demo_desc_groceries, party: m.demo_contact_market, type: 'expense', cents: 8_640 },
  { description: m.demo_desc_coffee, party: m.demo_contact_coffee, type: 'expense', cents: 450 },
  { description: m.demo_desc_freelance, party: m.demo_contact_client, type: 'income', cents: 65_000 },
  { description: m.demo_desc_internet, party: m.demo_contact_utility, type: 'expense', cents: 4_500 },
] as const

const signed = (move: (typeof MOVES)[number]) => (move.type === 'income' ? move.cents : -move.cents)

/**
 * The hero's ledger: movements arrive one by one and the balance above them recomputes, which is
 * the whole idea of the app (a balance is the sum of its movements, never a typed number).
 */
export function LiveLedger() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [count, setCount] = useState(0)
  const shown = reduced ? MOVES.length : count

  useEffect(() => {
    if (!inView || reduced) return
    // After the last movement the book rests a moment, then starts over.
    const wait = count === 0 ? 900 : count === MOVES.length ? 5200 : 2100
    const timer = setTimeout(() => setCount((current) => (current === MOVES.length ? 0 : current + 1)), wait)
    return () => clearTimeout(timer)
  }, [inView, reduced, count])

  const totalCents = MOVES.slice(0, shown).reduce((sum, move) => sum + signed(move), OPENING_CENTS)
  const balance = useTweened(totalCents, 1400)

  return (
    <div ref={ref} className="grid gap-6 border border-line bg-raised p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="label-mono text-muted-foreground">{m.landing_ledger_label()}</span>
        <span className="label-mono flex items-center gap-2 text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-60" />
            <span className="relative size-1.5 rounded-full bg-signal" />
          </span>
          {m.landing_ledger_live()}
        </span>
      </div>
      <div className="grid gap-2">
        <p className="type-title font-medium text-ink tabular-nums">
          {formatMoney(Math.round(balance) / 100, CURRENCY)}
        </p>
        <p className="label-mono text-faint">{m.landing_ledger_formula()}</p>
      </div>
      {/* Every row is always laid out and only fades in, so the panel never changes height. */}
      <ul className={rowsClass}>
        <li className="flex items-baseline justify-between gap-4 py-3">
          <span className="label-mono text-muted-foreground">{m.demo_opening_balance()}</span>
          <span className="text-sm text-soft tabular-nums">{formatMoney(OPENING_CENTS / 100, CURRENCY)}</span>
        </li>
        {MOVES.map((move, index) => (
          <li
            key={move.description.name}
            className={cn(
              'flex items-baseline justify-between gap-4 py-3 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)]',
              index < shown ? 'opacity-100' : 'translate-y-2 opacity-0',
            )}
          >
            <span className="grid min-w-0 gap-1">
              <span className="truncate text-sm text-ink">{move.description()}</span>
              <span className="label-mono truncate text-muted-foreground">{move.party()}</span>
            </span>
            <span
              className={cn('shrink-0 text-sm tabular-nums', move.type === 'income' ? 'text-income' : 'text-ink')}
            >
              {formatSignedAmount(move.type, move.cents / 100, CURRENCY)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
