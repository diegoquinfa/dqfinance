import { and, like, or, type SQL, type SQLWrapper } from 'drizzle-orm'
import { accentFree, accentFreeSql } from './accent-free.ts'

/** The three fields a word can appear in: what the movement was. */
export type SearchedFields = {
  title: SQLWrapper
  description: SQLWrapper
  category: SQLWrapper
}

/**
 * The movements that carry every word of the query, in the title, the description or the category.
 * The words are parameters, never SQL, so a `%` in the query is just a word. The comparison folds
 * the diacritics on both sides, so "educacion" finds "Educación".
 */
export const searchFilter = (terms: string[], fields: SearchedFields): SQL | undefined => {
  if (terms.length === 0) return undefined
  const title = accentFreeSql(fields.title)
  const description = accentFreeSql(fields.description)
  const category = accentFreeSql(fields.category)
  return and(
    ...terms.map((term) => {
      const pattern = `%${accentFree(term)}%`
      return or(like(title, pattern), like(description, pattern), like(category, pattern))
    }),
  )
}
