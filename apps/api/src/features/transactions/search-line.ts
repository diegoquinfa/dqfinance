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

/**
 * The line an agent scans: the day, the kind, the amount, the category, the name and the id.
 * One line per movement, so twenty results cost twenty lines and not twenty objects.
 */
export const searchLine = (row: SearchRow) =>
  [
    row.occurredAt.slice(0, 10),
    row.type,
    `${row.amount} ${row.currency}`,
    row.category.name,
    row.title ?? row.description ?? '-',
    row.id,
  ].join(' | ')
