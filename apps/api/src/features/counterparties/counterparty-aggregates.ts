import { fromCents } from '../../shared/money.ts'
import type { counterparty } from './counterparty.schema.ts'

type Kind = typeof counterparty.$inferSelect.kind

/** One row of the grouped query: a counterparty and, when it has movements, the totals of one currency. */
export type CounterpartyAggregateRow = {
  id: string
  name: string
  kind: Kind
  currency: string | null
  spentCents: number | null
  receivedCents: number | null
  movements: number
  lastMovementAt: number | null
}

/** What one currency moved with a counterparty. Money never mixes currencies, so each has its own. */
export type CounterpartyTotals = {
  currency: string
  spent: number
  received: number
}

export type CounterpartyWithTotals = {
  id: string
  name: string
  kind: Kind
  totals: CounterpartyTotals[]
  movements: number
  lastMovementAt: string | null
}

type Accumulator = {
  id: string
  name: string
  kind: Kind
  totals: CounterpartyTotals[]
  movements: number
  lastAt: number | null
}

/**
 * Folds the rows grouped by counterparty and currency into one entry per counterparty.
 * A contact without movements keeps its place: no totals, no movements, no date.
 */
export function counterpartyAggregates(rows: CounterpartyAggregateRow[]): CounterpartyWithTotals[] {
  const byId = new Map<string, Accumulator>()
  for (const row of rows) {
    let entry = byId.get(row.id)
    if (!entry) {
      entry = { id: row.id, name: row.name, kind: row.kind, totals: [], movements: 0, lastAt: null }
      byId.set(row.id, entry)
    }
    entry.movements += row.movements
    if (row.lastMovementAt !== null && (entry.lastAt === null || row.lastMovementAt > entry.lastAt)) {
      entry.lastAt = row.lastMovementAt
    }
    if (row.currency !== null) {
      entry.totals.push({
        currency: row.currency,
        spent: fromCents(Number(row.spentCents ?? 0)),
        received: fromCents(Number(row.receivedCents ?? 0)),
      })
    }
  }
  return [...byId.values()].map((entry) => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    // One line per currency, in a stable order.
    totals: entry.totals.sort((a, b) => a.currency.localeCompare(b.currency)),
    movements: entry.movements,
    lastMovementAt: entry.lastAt === null ? null : new Date(entry.lastAt).toISOString(),
  }))
}
