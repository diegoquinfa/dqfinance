import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from 'cn'

/** Whether the element is on screen. With `once`, it stays true after the first time. */
export function useInView<T extends Element>({ once = false, margin = '0px 0px -12% 0px' } = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (once && entry.isIntersecting) observer.disconnect()
      },
      { rootMargin: margin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [once, margin])
  return [ref, inView] as const
}

/** The visitor's "reduce motion" setting. False on the server. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Eases from the value it shows to `target` whenever `target` changes (exponential ease-out). */
export function useTweened(target: number, duration = 1200) {
  const [value, setValue] = useState(target)
  const shown = useRef(target)
  useEffect(() => {
    const origin = shown.current
    if (origin === target) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      shown.current = progress === 1 ? target : origin + (target - origin) * (1 - 2 ** (-10 * progress))
      setValue(shown.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

/** Rises into place the first time it scrolls into view. `group/reveal` lets children follow it. */
export function Reveal({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: true })
  return (
    <div
      ref={ref}
      data-shown={inView || undefined}
      className={cn('group/reveal reveal', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/** A heading whose words rise one by one out of their own line, on load. */
export function RisingWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return text.split(' ').map((word, index) => (
    // The space sits between the clipping boxes, so the line still wraps between words.
    <Fragment key={index}>
      <span className={cn('-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom', className)}>
        <span className="animate-word inline-block" style={{ animationDelay: `${delay + index * 70}ms` }}>
          {word}
        </span>
      </span>{' '}
    </Fragment>
  ))
}
