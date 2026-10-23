import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { m } from '#/shared/i18n'
import { GoalConfetti } from './goal-confetti'
import { goalsToCelebrate } from './goal-reached'
import { useCelebrateGoal, useSavingsGoals } from './savings-goals-api'

/**
 * Celebrates each goal the user reached and has not been celebrated for: one burst and one toast, then
 * the server marks the goals, so they never repeat on any device. It sits in the signed-in shell, so a
 * contribution made on the form and one an agent made over MCP are celebrated alike.
 */
export function GoalCelebration() {
  const goals = useSavingsGoals()
  const { mutate: celebrate } = useCelebrateGoal()
  // The goals already sent from this mount: a refetch while their request is in flight does not repeat them.
  const sent = useRef(new Set<string>())
  const [bursting, setBursting] = useState(false)
  const finish = useCallback(() => setBursting(false), [])

  useEffect(() => {
    const fresh = goalsToCelebrate(goals.data ?? [], sent.current)
    if (fresh.length === 0) return
    for (const goal of fresh) {
      sent.current.add(goal.id)
      celebrate(goal.id)
    }
    setBursting(true)
    toast.success(m.savings_reached())
  }, [goals.data, celebrate])

  return bursting ? <GoalConfetti onDone={finish} /> : null
}
