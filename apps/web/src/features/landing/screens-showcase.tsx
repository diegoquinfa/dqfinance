import { useEffect, useRef, useState } from 'react'
import { cn } from 'cn'
import { m } from '#/shared/i18n'

const SCREENS = [
  { src: '/screens/overview.png', title: m.nav_overview, body: m.landing_screen_overview_body },
  { src: '/screens/movements.png', title: m.nav_transactions, body: m.landing_screen_movements_body },
  { src: '/screens/accounts.png', title: m.nav_accounts, body: m.landing_screen_accounts_body },
] as const

/**
 * The real screens, driven by the scroll: the block pins to the viewport inside a taller track,
 * and the scroll through that track picks the tab. The chosen tab's top line fills in lilac with
 * the scroll inside its own stretch, then hands over to the next. A tab click scrolls to its stretch.
 */
export function ScreensShowcase() {
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = track.current
    if (!element) return
    let frame = 0
    const update = () => {
      const box = element.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -box.top / (box.height - window.innerHeight))) * SCREENS.length
      const index = Math.min(SCREENS.length - 1, Math.floor(progress))
      // The fill is a CSS variable, so scrolling repaints a line without re-rendering React.
      element.style.setProperty('--fill', String(Math.min(1, progress - index)))
      setActive(index)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  function show(index: number) {
    const element = track.current
    if (!element) return
    const distance = element.offsetHeight - window.innerHeight
    const top = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + ((index + 0.5) / SCREENS.length) * distance, behavior: 'smooth' })
  }

  return (
    // Each screen gets about 60vh of scroll; the pinned block stays for all of it.
    <div ref={track} className="relative h-[280vh]">
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] items-center">
        <div className="grid w-full grid-cols-1 gap-8 xl:grid-cols-9 xl:gap-x-12">
          <div role="tablist" aria-label={m.landing_section_screens()} className="grid content-start xl:col-span-3">
            {SCREENS.map((screen, index) => (
              <button
                key={screen.src}
                type="button"
                role="tab"
                aria-selected={index === active}
                onClick={() => show(index)}
                className="group/tab relative grid gap-2 border-t border-line py-5 text-left last:border-b"
              >
                {index === active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -top-px h-px origin-left bg-signal"
                    style={{ transform: 'scaleX(var(--fill, 0))' }}
                  />
                )}
                <span className={cn('label-mono', index === active ? 'text-signal' : 'text-faint')}>0{index + 1}</span>
                <span
                  className={cn(
                    'type-heading-sm font-medium transition-[color,transform] duration-300 group-hover/tab:translate-x-1',
                    index === active ? 'text-ink' : 'text-muted-foreground',
                  )}
                >
                  {screen.title()}
                </span>
                <span
                  className={cn(
                    'grid text-sm text-muted-foreground transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-expo)]',
                    index === active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <span className="overflow-hidden">{screen.body()}</span>
                </span>
              </button>
            ))}
          </div>
          <div role="tabpanel" className="relative aspect-[1859/1259] border border-line bg-raised xl:col-span-6">
            {SCREENS.map((screen, index) => (
              <img
                key={screen.src}
                src={screen.src}
                alt={screen.title()}
                loading="lazy"
                aria-hidden={index !== active}
                className={cn(
                  'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-1000 ease-[var(--ease-out-expo)]',
                  index === active ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
