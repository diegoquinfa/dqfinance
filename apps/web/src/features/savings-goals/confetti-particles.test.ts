import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnParticles, stepParticle } from './confetti-particles.ts'

const colors = ['#a78bfa', '#f0f0ec']
const origin = { x: 400, y: 300 }

test('a burst spawns the requested pieces from the origin, in the given colors', () => {
  const pieces = spawnParticles(120, origin, colors, () => 0.5)
  assert.equal(pieces.length, 120)
  for (const piece of pieces) {
    assert.equal(piece.x, origin.x)
    assert.equal(piece.y, origin.y)
    assert.ok(colors.includes(piece.color))
  }
})

test('a piece rises first, then gravity brings it back down', () => {
  let piece = spawnParticles(1, origin, colors, () => 0.5)[0]!
  assert.ok(piece.vy < 0, 'the burst goes up')
  for (let step = 0; step < 300; step++) piece = stepParticle(piece, 0.01)
  assert.ok(piece.vy > 0, 'after three seconds it is falling')
  assert.ok(piece.y > origin.y, 'and it has fallen below where it started')
})

test('stepping a piece leaves the piece it was given unchanged', () => {
  const piece = spawnParticles(1, origin, colors, () => 0.5)[0]!
  const before = { ...piece }
  stepParticle(piece, 0.1)
  assert.deepEqual(piece, before)
})
