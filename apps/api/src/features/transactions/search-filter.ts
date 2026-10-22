import { and, like, or, type SQL } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

/** The three fields a word can appear in: what the movement was. */
export type SearchedFields = {
  title: AnySQLiteColumn
  description: AnySQLiteColumn
  category: AnySQLiteColumn
}

/**
 * The movements that carry every word of the query, in the title, the description or the category.
 * The words are parameters, never SQL, so a `%` in the query is just a word.
 */
export const searchFilter = (terms: string[], fields: SearchedFields): SQL | undefined =>
  terms.length === 0
    ? undefined
    : and(
        ...terms.map((term) =>
          or(
            like(fields.title, `%${term}%`),
            like(fields.description, `%${term}%`),
            like(fields.category, `%${term}%`),
          ),
        ),
      )
