import { useEffect, useRef } from 'react'
import { cn } from 'cn'

const GAP = 26
const DOT = 1.5
const CURSOR_RADIUS = 180
/** How long, in seconds, a pulse keeps a dot lit after crossing it. */
const AFTERGLOW = 0.9

type Pulse = { line: number; head: number; speed: number; vertical: boolean }

/**
 * The landing's background: a grid of square dots, like the ruled page of a ledger. A slow wave
 * breathes through it, the cursor lights the dots around it, and now and then a lilac pulse runs
 * along a row or a column, a movement entering the book.
 *
 * A canvas, so it costs one draw per frame and no DOM. It pauses off screen and in a hidden tab,
 * and with reduced motion it draws one still frame.
 */
export function LedgerField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const css = getComputedStyle(document.documentElement)
    const ink = css.getPropertyValue('--ink').trim()
    const signal = css.getPropertyValue('--signal').trim()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let columns = 0
    let rows = 0
    let lit = new Float32Array(0)
    const pulses: Pulse[] = []
    const pointer = { x: -1e4, y: -1e4 }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio, 2)
      width = canvas!.clientWidth
      height = canvas!.clientHeight
      canvas!.width = width * ratio
      canvas!.height = height * ratio
      context!.setTransform(ratio, 0, 0, ratio, 0, 0)
      columns = Math.ceil(width / GAP) + 1
      rows = Math.ceil(height / GAP) + 1
      lit = new Float32Array(columns * rows)
    }

    function spawn() {
      const vertical = Math.random() < 0.3
      const forward = Math.random() < 0.5
      pulses.push({
        line: Math.floor(Math.random() * (vertical ? columns : rows)),
        head: forward ? 0 : (vertical ? rows : columns) - 1,
        speed: (12 + Math.random() * 14) * (forward ? 1 : -1),
        vertical,
      })
    }

    function draw(time: number, delta: number) {
      context!.clearRect(0, 0, width, height)
      const t = time / 1000
      const fade = Math.exp(-delta / AFTERGLOW)

      for (const pulse of pulses) {
        const from = Math.round(pulse.head)
        pulse.head += pulse.speed * delta
        const to = Math.round(pulse.head)
        for (let step = Math.min(from, to); step <= Math.max(from, to); step++) {
          const index = pulse.vertical ? step * columns + pulse.line : pulse.line * columns + step
          if (index >= 0 && index < lit.length) lit[index] = 1
        }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const end = pulses[i].vertical ? rows : columns
        if (pulses[i].head < -1 || pulses[i].head > end) pulses.splice(i, 1)
      }

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = column * GAP
          const y = row * GAP
          // Three slow sines stand in for noise: cheap, smooth and never repeating on screen.
          const wave =
            Math.sin(x * 0.011 + t * 0.55) + Math.sin(y * 0.016 - t * 0.4) + Math.sin((x + y) * 0.007 + t * 0.25)
          const level = (wave + 3) / 6
          let alpha = 0.05 + level ** 4 * 0.32
          const distance = Math.hypot(x - pointer.x, y - pointer.y)
          if (distance < CURSOR_RADIUS) alpha += (1 - distance / CURSOR_RADIUS) ** 2 * 0.55

          const index = row * columns + column
          const glow = lit[index]
          lit[index] *= fade
          if (glow > 0.04) {
            context!.globalAlpha = Math.min(1, glow)
            context!.fillStyle = signal
            context!.fillRect(x - DOT, y - DOT, DOT * 2, DOT * 2)
          } else {
            context!.globalAlpha = Math.min(1, alpha)
            context!.fillStyle = ink
            context!.fillRect(x - DOT / 2, y - DOT / 2, DOT, DOT)
          }
        }
      }
      context!.globalAlpha = 1
    }

    resize()
    if (still) {
      draw(0, 0)
      return
    }

    let visible = true
    let frame = 0
    let last = performance.now()
    let nextPulse = 400
    const loop = (now: number) => {
      // Capped, so a tab coming back from the background does not jump.
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      nextPulse -= delta * 1000
      if (nextPulse <= 0) {
        spawn()
        nextPulse = 700 + Math.random() * 1400
      }
      draw(now, delta)
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      cancelAnimationFrame(frame)
      if (!visible || document.hidden) return
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }

    const sizeObserver = new ResizeObserver(() => resize())
    sizeObserver.observe(canvas)
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      start()
    })
    viewObserver.observe(canvas)
    const onPointer = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect()
      pointer.x = event.clientX - box.left
      pointer.y = event.clientY - box.top
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', start)

    return () => {
      cancelAnimationFrame(frame)
      sizeObserver.disconnect()
      viewObserver.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 size-full',
        // Fades into the page at the bottom, so the next section starts on plain canvas.
        '[mask-image:linear-gradient(to_bottom,black_55%,transparent)]',
        className,
      )}
    />
  )
}
