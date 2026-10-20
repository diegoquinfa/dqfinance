import type { CSSProperties, ReactNode } from 'react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'
import { Reveal } from './motion'

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

/** A bar standing in for a line of text in the drawings. */
function Bar({ width, className, style }: { width: string; className?: string; style?: CSSProperties }) {
  return <span className={cn('block h-1.5 bg-line-strong', className)} style={{ width, ...style }} />
}

/** Three movements land, a rule is drawn under them, and their sum appears. */
function LedgerArt() {
  return (
    <div className="grid w-40 gap-2">
      {['70%', '45%', '60%'].map((width, index) => (
        <div key={width} className="animate-hold-in flex items-center justify-between gap-3" style={delay(index * 220)}>
          <Bar width={width} />
          <Bar width="18%" className={index === 0 ? 'bg-income' : 'bg-soft'} />
        </div>
      ))}
      <span className="animate-hold-draw block h-px bg-ink" style={delay(700)} />
      <div className="animate-hold-in flex justify-end" style={delay(900)}>
        <Bar width="30%" className="h-2 bg-ink" />
      </div>
    </div>
  )
}

/** A message, the tool the assistant calls, and the movement it records. */
function AgentArt() {
  return (
    <div className="grid w-44 gap-2">
      <span className="animate-hold-in justify-self-end bg-surface px-3 py-2">
        <Bar width="5rem" className="bg-soft" />
      </span>
      <span
        className="animate-hold-in label-mono w-fit border border-line-strong px-2 py-1 normal-case tracking-normal text-ink"
        style={delay(350)}
      >
        <span className="text-signal">↳</span> create_transaction
      </span>
      <span className="animate-hold-in flex items-center justify-between gap-3" style={delay(700)}>
        <Bar width="55%" />
        <Bar width="20%" className="bg-soft" />
      </span>
    </div>
  )
}

/** A statement read top to bottom: the lilac scan passes and the duplicates get struck out. */
function ImportArt() {
  const rows = ['80%', '55%', '70%', '62%', '75%']
  return (
    <div className="relative grid w-40 gap-2.5 py-1">
      {rows.map((width, index) => {
        const duplicate = index === 1 || index === 3
        return (
          <span key={index} className={cn('relative flex items-center', duplicate && 'opacity-40')}>
            <Bar width={width} />
            {duplicate && (
              <span className="animate-hold-draw absolute top-1/2 left-0 h-px w-full bg-ink" style={delay(index * 180)} />
            )}
          </span>
        )
      })}
      <span className="pointer-events-none absolute inset-0 animate-[travel-y_2.6s_ease-in-out_infinite_alternate]">
        <span className="absolute inset-x-0 top-0 h-px bg-signal" />
      </span>
    </div>
  )
}

/** Money leaves one of your accounts and lands in another, never counted as spent. */
function TransferArt() {
  return (
    <div className="grid w-44 grid-cols-[2.5rem_1fr_2.5rem] items-center">
      <span className="label-mono grid size-10 place-items-center border border-line-strong text-ink">−</span>
      <span className="relative h-px bg-line-strong">
        <span className="absolute inset-0 animate-[travel_1.6s_ease-in-out_infinite_alternate]">
          <span className="absolute top-1/2 left-0 size-1.5 -translate-y-1/2 bg-signal" />
        </span>
      </span>
      <span className="label-mono grid size-10 place-items-center border border-line-strong text-income">+</span>
    </div>
  )
}

/** A year of months filling in, with the one that is due pulsing. */
function RecurringArt() {
  return (
    <div className="grid w-40 grid-cols-6 gap-1.5">
      {Array.from({ length: 12 }, (_, index) =>
        index === 9 ? (
          <span key={index} className="aspect-square animate-pulse border border-signal bg-signal/40" />
        ) : (
          <span
            key={index}
            className={cn('animate-hold-in aspect-square', index < 9 ? 'bg-soft' : 'border border-line-strong')}
            style={delay(index * 90)}
          />
        ),
      )}
    </div>
  )
}

/** A month of days, each lit by how much moved on it; today is outlined in lilac. */
function CalendarArt() {
  // Fixed, so the server and the browser draw the same month.
  const levels = [0, 2, 1, 0, 3, 1, 0, 1, 0, 2, 0, 1, 3, 0, 2, 1, 0, 0, 1, 2, 0, 3, 1, 0, 2, 0, 1, 0]
  return (
    <div className="grid w-40 grid-cols-7 gap-1">
      {levels.map((level, index) => (
        <span
          key={index}
          className={cn('animate-hold-in aspect-square', index === 17 ? 'border border-signal' : 'bg-ink')}
          style={{ ...delay(index * 45), ...(index === 17 ? {} : { opacity: [0.08, 0.25, 0.5, 0.9][level] }) }}
        />
      ))}
    </div>
  )
}

const FEATURES: { title: () => string; body: () => string; art: ReactNode }[] = [
  { title: m.landing_feature_ledger_title, body: m.landing_feature_ledger_body, art: <LedgerArt /> },
  { title: m.landing_feature_agent_title, body: m.landing_feature_agent_body, art: <AgentArt /> },
  { title: m.landing_feature_import_title, body: m.landing_feature_import_body, art: <ImportArt /> },
  { title: m.landing_feature_transfers_title, body: m.landing_feature_transfers_body, art: <TransferArt /> },
  { title: m.landing_feature_recurring_title, body: m.landing_feature_recurring_body, art: <RecurringArt /> },
  { title: m.landing_feature_calendar_title, body: m.landing_feature_calendar_body, art: <CalendarArt /> },
]

/**
 * What the app does, as a ruled grid (lines between cells, never boxes): each feature is a small
 * drawing that plays on its own, a title, and one line.
 */
export function FeatureGrid() {
  return (
    <ul className="grid border-t border-l border-line sm:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((feature, index) => (
        <li key={feature.title.name} className="group/cell border-r border-b border-line">
          <Reveal delay={(index % 3) * 100} className="grid h-full content-start gap-6 p-6 md:p-8">
            <div aria-hidden className="grid h-28 place-items-center">
              {feature.art}
            </div>
            <div className="grid gap-2">
              <h3 className="flex gap-3 text-base font-medium text-ink">
                <span className="label-mono pt-1 text-faint transition-colors duration-300 group-hover/cell:text-signal">
                  0{index + 1}
                </span>
                {feature.title()}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.body()}</p>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}
