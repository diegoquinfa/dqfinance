import { useEffect, useRef } from 'react'
import { spawnParticles, stepParticle, type Particle } from './confetti-particles'

const PIECES = 120
const DURATION = 2500
const FADE = 600
/** The burst's colors, read from the tokens so it fits the dark theme and the lilac signal. */
const TOKENS = ['--signal', '--ink', '--soft', '--income']

function drawPiece(context: CanvasRenderingContext2D, piece: Particle) {
  context.save()
  context.translate(piece.x, piece.y)
  context.rotate(piece.rotation)
  context.fillStyle = piece.color
  context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2)
  context.restore()
}

/**
 * One burst over the page when a goal is reached. A fixed canvas that ignores the pointer; it calls
 * onDone once the burst has fallen, and the parent removes it. With reduced motion it draws nothing
 * and calls onDone at once: the success message says it.
 */
export function GoalConfetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width
    canvas.height = height
    const style = getComputedStyle(document.documentElement)
    const colors = TOKENS.map((token) => style.getPropertyValue(token).trim())
    let particles = spawnParticles(PIECES, { x: width / 2, y: height * 0.35 }, colors, Math.random)
    const start = performance.now()
    let last = start
    let frame = 0

    const draw = (now: number) => {
      const elapsed = now - start
      if (elapsed >= DURATION) {
        onDone()
        return
      }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      particles = particles.map((piece) => stepParticle(piece, dt))
      context.clearRect(0, 0, width, height)
      context.globalAlpha = Math.min(1, (DURATION - elapsed) / FADE)
      for (const piece of particles) drawPiece(context, piece)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [onDone])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />
}
