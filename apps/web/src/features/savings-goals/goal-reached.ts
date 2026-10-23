/**
 * Whether a payment reaches a goal now: short of its target before, at or past it after. Compared in
 * cents, so a decimal sum does not decide it (0.1 + 0.7 is 0.7999999999999999 in floats).
 */
/** The reached goals the app has not celebrated yet, leaving out the ones it already sent. */
export const goalsToCelebrate = (
  goals: { id: string; reached: boolean; celebrated: boolean }[],
  sent: ReadonlySet<string>,
) => goals.filter((goal) => goal.reached && !goal.celebrated && !sent.has(goal.id))

export const reachesGoal = (goal: { target: number; contributed: number }, amount: number): boolean => {
  const target = Math.round(goal.target * 100)
  const before = Math.round(goal.contributed * 100)
  return before < target && before + Math.round(amount * 100) >= target
}
