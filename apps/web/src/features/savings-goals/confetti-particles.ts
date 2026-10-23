// Pure particle math for the goal confetti. No imports, so it tests without a DOM.

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  /** Sideways push of the air, constant for this piece. */
  drift: number
  size: number
  rotation: number
  spin: number
  color: string
}

/** Pixels per second squared. */
const GRAVITY = 900

/** A burst fans up from the origin; the air slows it and gravity brings it down. */
export function spawnParticles(
  count: number,
  origin: { x: number; y: number },
  colors: string[],
  random: () => number,
): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.2
    const speed = 300 + random() * 500
    return {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      drift: (random() - 0.5) * 60,
      size: 6 + random() * 6,
      rotation: random() * Math.PI * 2,
      spin: (random() - 0.5) * 12,
      color: colors[Math.floor(random() * colors.length)] ?? colors[0] ?? '',
    }
  })
}

/** Moves a piece by dt seconds. Returns a new piece; the input is not changed. */
export function stepParticle(p: Particle, dt: number): Particle {
  const air = Math.max(0, 1 - 1.6 * dt)
  return {
    ...p,
    x: p.x + (p.vx + p.drift) * dt,
    y: p.y + p.vy * dt,
    vx: p.vx * air,
    vy: p.vy * air + GRAVITY * dt,
    rotation: p.rotation + p.spin * dt,
  }
}
