import { Fragment, useEffect, useRef } from 'react'

/**
 * A paragraph that lights up word by word as it scrolls past the middle of the viewport. The scroll
 * position becomes a CSS variable, so each word computes its own opacity and React never re-renders.
 */
export function ScrollStatement({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const words = text.split(' ')

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let frame = 0
    const update = () => {
      const box = element.getBoundingClientRect()
      const viewport = window.innerHeight
      // Starts when the top reaches 80 % of the viewport, ends when the bottom reaches 65 %.
      const progress = (viewport * 0.8 - box.top) / (box.height + viewport * 0.15)
      element.style.setProperty('--progress', String(Math.min(1, Math.max(0, progress))))
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

  return (
    <p ref={ref} className="type-title font-medium text-ink">
      {words.map((word, index) => (
        <Fragment key={index}>
          <span style={{ opacity: `clamp(0.16, calc(var(--progress, 0) * ${words.length} - ${index}), 1)` }}>{word}</span>{' '}
        </Fragment>
      ))}
    </p>
  )
}
