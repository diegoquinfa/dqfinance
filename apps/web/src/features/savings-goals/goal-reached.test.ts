import assert from 'node:assert/strict'
import { test } from 'node:test'
import { goalsToCelebrate, reachesGoal } from './goal-reached.ts'

test('a payment that brings the goal to its target reaches it', () => {
  assert.equal(reachesGoal({ target: 300, contributed: 200 }, 100), true)
  assert.equal(reachesGoal({ target: 300, contributed: 200 }, 150), true)
})

test('a payment one cent short does not reach it', () => {
  assert.equal(reachesGoal({ target: 300, contributed: 200 }, 99.99), false)
})

test('a goal already at its target is not reached again', () => {
  assert.equal(reachesGoal({ target: 300, contributed: 300 }, 50), false)
})

test('a decimal sum that float arithmetic misses still reaches the goal', () => {
  // 0.1 + 0.7 is 0.7999999999999999 in floats; in cents it is exactly 80.
  assert.equal(reachesGoal({ target: 0.8, contributed: 0.1 }, 0.7), true)
})

test('only reached goals that were not celebrated yet, and not sent this visit, are celebrated', () => {
  const goals = [
    { id: 'reached', reached: true, celebrated: false },
    { id: 'celebrated', reached: true, celebrated: true },
    { id: 'short', reached: false, celebrated: false },
    { id: 'sent', reached: true, celebrated: false },
  ]
  assert.deepEqual(goalsToCelebrate(goals, new Set(['sent'])).map((goal) => goal.id), ['reached'])
})
