import { z } from 'zod'
import type { Db } from '../../db'
import type { Locale } from '../../shared/locale'
import { listTransactions, listTransactionsInput, searchQuery } from './list-transactions'
import { searchLine } from './search-line'

export const searchTransactionsInput = listTransactionsInput.extend({
  q: searchQuery.min(1),
})

/**
 * The movements that match the words of the query, one line each: an agent scans twenty lines
 * instead of twenty objects, and asks for the detail of the ones that matter.
 */
export async function searchTransactions(
  db: Db,
  userId: string,
  locale: Locale,
  input: z.infer<typeof searchTransactionsInput>,
) {
  const movements = await listTransactions(db, userId, locale, { ...input, limit: input.limit ?? 20 })
  return movements.map(searchLine)
}
