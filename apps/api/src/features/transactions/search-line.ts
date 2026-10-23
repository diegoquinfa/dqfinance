import { todayIn } from '../../shared/dates.ts'

/** What a search returns per movement: enough to recognize it, and the id to ask about it. */
export type SearchRow = {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: { name: string }
  title: string | null
  description: string | null
  occurredAt: string
}

// Free user text must not break the line: a newline or a `|` would forge a record for the agent.
const flat = (text: string) => text.replace(/[\r\n|]/g, ' ')

/**
 * The line an agent scans: the day, the kind, the amount, the category, the name and the id.
 * One line per movement, so twenty results cost twenty lines and not twenty objects.
 * The day is the user's (`timeZone`), not UTC: a 21:00 movement in Bogotá is still that day.
 */
export const searchLine = (row: SearchRow, timeZone: string) =>
  [
    todayIn(timeZone, new Date(row.occurredAt)),
    row.type,
    `${row.amount} ${row.currency}`,
    flat(row.category.name),
    flat(row.title ?? row.description ?? '-'),
    row.id,
  ].join(' | ')
