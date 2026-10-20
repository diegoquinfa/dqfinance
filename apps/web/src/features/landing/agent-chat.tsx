import { useEffect, useRef, useState } from 'react'
import { ArrowUp, FileText } from 'lucide-react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { useInView, useReducedMotion } from './motion'

/** Examples of assistants that speak MCP. Brand names, so they are the same in every language. */
const ASSISTANTS = ['Grok', 'Claude', 'ChatGPT', 'Gemini'] as const

type Line =
  | { kind: 'user'; text: () => string; file?: () => string }
  | { kind: 'tool'; name: string; args: string }
  | { kind: 'reply'; text: () => string }

/** The conversation, with the real tool names and arguments the MCP server takes. */
const SCRIPT: Line[] = [
  { kind: 'user', text: m.landing_chat_user_record },
  { kind: 'tool', name: 'create_transaction', args: 'type: expense · amount: 18.5 · categoryId: restaurants' },
  { kind: 'reply', text: m.landing_chat_reply_record },
  { kind: 'user', text: m.landing_chat_user_ask },
  { kind: 'tool', name: 'summarize_transactions', args: 'type: expense · categoryId: groceries · from: 2026-10-01' },
  { kind: 'reply', text: m.landing_chat_reply_ask },
  { kind: 'user', text: m.landing_chat_user_import, file: m.landing_chat_file },
  { kind: 'tool', name: 'import_transactions', args: 'rows: 32 · dryRun: true' },
  { kind: 'reply', text: m.landing_chat_reply_import },
]

/** What has played so far: the lines fully shown, and the one being written. */
type Frame = { done: number; partial: string; draft: string; running: boolean }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * An example of an assistant with DQFinance connected, playing on its own: the person types, the
 * assistant calls a tool, and answers. It plays while on screen and starts over at the end with the
 * next assistant; with reduced motion it shows the whole conversation at once.
 *
 * The window is the assistant's app, not DQFinance: the strip above it says so, and its lilac dot
 * crosses the MCP line while a tool runs.
 */
export function AgentChat() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [frame, setFrame] = useState<Frame>({ done: 0, partial: '', draft: '', running: false })
  const [assistant, setAssistant] = useState(0)
  const name = ASSISTANTS[assistant]
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!inView || reduced) return
    let cancelled = false
    const set = (next: Partial<Frame>) => !cancelled && setFrame((current) => ({ ...current, ...next }))

    async function play() {
      while (!cancelled) {
        set({ done: 0, partial: '', draft: '', running: false })
        await sleep(700)
        for (let index = 0; index < SCRIPT.length && !cancelled; index++) {
          const line = SCRIPT[index]
          if (line.kind === 'user') {
            // The person types in the box, then sends.
            const text = line.text()
            for (let end = 1; end <= text.length && !cancelled; end++) {
              set({ draft: text.slice(0, end) })
              await sleep(26 + Math.random() * 40)
            }
            await sleep(450)
            set({ draft: '', done: index + 1 })
            await sleep(500)
          } else if (line.kind === 'tool') {
            set({ running: true, done: index + 1 })
            await sleep(1300)
            set({ running: false })
            await sleep(350)
          } else {
            // The answer streams in word by word, like a model's.
            const words = line.text().split(' ')
            for (let end = 1; end <= words.length && !cancelled; end++) {
              set({ partial: words.slice(0, end).join(' ') })
              await sleep(45)
            }
            set({ partial: '', done: index + 1 })
            await sleep(1600)
          }
        }
        await sleep(5000)
        if (!cancelled) setAssistant((current) => (current + 1) % ASSISTANTS.length)
      }
    }
    void play()
    return () => {
      cancelled = true
    }
  }, [inView, reduced])

  const done = reduced ? SCRIPT.length : frame.done
  const streaming = !reduced && frame.partial ? SCRIPT[done] : undefined

  // Keeps the newest line in view as the conversation grows.
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })
  }, [done, frame.partial])

  return (
    <figure ref={ref} className="grid grid-cols-1 gap-4">
      <ToggleGroup
        type="single"
        size="sm"
        aria-label={m.landing_chat_pick()}
        value={name}
        onValueChange={(value) => setAssistant(ASSISTANTS.indexOf(value as (typeof ASSISTANTS)[number]))}
      >
        {ASSISTANTS.map((option) => (
          <ToggleGroupItem key={option} value={option} className="px-3">
            {option}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Where the conversation happens: the assistant's own app, reaching DQFinance over MCP. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(3rem,8rem)_minmax(0,1fr)]">
        <span className="grid gap-1 border border-line px-4 py-3">
          <span className="label-mono text-muted-foreground">{m.landing_chat_their_app()}</span>
          <span key={name} className="animate-rise truncate text-sm text-ink">
            {name}
          </span>
        </span>
        <span className="relative grid h-full place-items-center">
          <span className="label-mono absolute top-1 text-faint">MCP</span>
          <span aria-hidden className="relative h-px w-full bg-line-strong">
            {frame.running && (
              <span className="absolute inset-0 animate-[travel_700ms_ease-in-out_infinite_alternate]">
                <span className="absolute top-1/2 left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 bg-signal" />
              </span>
            )}
          </span>
        </span>
        <span className="grid gap-1 border border-line px-4 py-3">
          <span className="label-mono text-muted-foreground">{m.landing_chat_your_ledger()}</span>
          <span className="truncate text-sm text-ink">{m.app_name()}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 border border-line bg-raised">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <span key={name} className="animate-rise text-sm font-medium text-ink">
            {name}
          </span>
          <span className="label-mono flex items-center gap-2 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-income" />
            {m.landing_chat_status()}
          </span>
        </div>
        {/* A column whose content sits at the bottom, like a chat: older lines leave by the top. */}
        <div
          ref={body}
          className="flex h-[26rem] flex-col overflow-hidden px-5 py-6 [mask-image:linear-gradient(to_bottom,transparent,black_15%)]"
        >
          <div className="mt-auto grid gap-5">
            {SCRIPT.slice(0, done).map((line, index) => (
              <ChatLine key={index} line={line} running={!reduced && frame.running && index === done - 1} />
            ))}
            {streaming?.kind === 'reply' && <p className="max-w-[90%] text-sm text-soft">{frame.partial}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          <p className="min-w-0 flex-1 truncate text-sm">
            {frame.draft ? (
              <span className="text-ink">{frame.draft}</span>
            ) : (
              <span className="text-muted-foreground">{m.landing_chat_input({ assistant: name })}</span>
            )}
            {frame.draft && <span className="animate-blink ml-px inline-block h-4 w-px translate-y-0.5 bg-signal" />}
          </p>
          <span
            aria-hidden
            className={cn(
              'grid size-8 place-items-center transition-colors duration-300',
              frame.draft ? 'bg-ink text-canvas' : 'bg-surface text-faint',
            )}
          >
            <ArrowUp className="size-4" />
          </span>
        </div>
      </div>
      <figcaption className="label-mono text-faint">{m.landing_chat_caption()}</figcaption>
    </figure>
  )
}

function ChatLine({ line, running }: { line: Line; running: boolean }) {
  if (line.kind === 'user')
    return (
      <div className="animate-rise grid max-w-[85%] gap-2 justify-self-end bg-surface px-4 py-3 text-sm text-ink">
        {line.file && (
          <span className="label-mono flex items-center gap-2 border border-line-strong px-3 py-2 text-soft">
            <FileText aria-hidden className="size-3.5" />
            {line.file()}
          </span>
        )}
        {line.text()}
      </div>
    )
  if (line.kind === 'tool')
    return (
      <div className="animate-rise grid w-fit max-w-full gap-1 border border-line-strong px-3 py-2">
        <span className="label-mono flex flex-wrap items-center gap-x-2 text-ink">
          <span aria-hidden className="text-signal">
            ↳
          </span>
          {line.name}
          <span className={cn('sm:ml-2', running ? 'animate-pulse text-muted-foreground' : 'text-income')}>
            {running ? m.landing_chat_tool_running() : m.landing_chat_tool_done()}
          </span>
        </span>
        <code className="label-mono break-all text-muted-foreground normal-case tracking-normal">{line.args}</code>
      </div>
    )
  // No rise: the reply already streamed in place.
  return <p className="max-w-[90%] text-sm text-soft">{line.text()}</p>
}
