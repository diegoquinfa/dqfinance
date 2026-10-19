/** What makes two movements the same one: source, type, amount, calendar day, and description. */
export type MovementFingerprint = {
  type: 'income' | 'expense'
  amountCents: number
  occurredAt: Date
  description: string | null
}

/** Calendar day in UTC, matching the days the API stores (occurred_at is a timestamp). */
export const calendarDay = (at: Date) => at.toISOString().slice(0, 10)

const signature = (m: MovementFingerprint) => `${m.type}|${m.amountCents}|${calendarDay(m.occurredAt)}`

/** Two rows are the same when both say what they were for and it matches; a missing description never blocks. */
const sameDescription = (a: string | null, b: string | null) => !a || !b || a === b

/**
 * Flags the rows that look like a movement already recorded on the same source, either in the
 * database or earlier in the same batch. Pure: no D1, so the rule tests on its own.
 */
export function duplicateFlags(batch: MovementFingerprint[], existing: MovementFingerprint[]) {
  const bySignature = new Map<string, MovementFingerprint[]>()
  const remember = (row: MovementFingerprint) => {
    const key = signature(row)
    const bucket = bySignature.get(key)
    if (bucket) bucket.push(row)
    else bySignature.set(key, [row])
  }
  existing.forEach(remember)

  return batch.map((row) => {
    const bucket = bySignature.get(signature(row)) ?? []
    const duplicate = bucket.some((other) => sameDescription(other.description, row.description))
    // A row the import will skip does not become the reason a later identical row is skipped.
    if (!duplicate) remember(row)
    return duplicate
  })
}
