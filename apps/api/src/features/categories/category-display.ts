import * as m from '@dqfinance/i18n/messages'
import type { Locale } from '../../shared/locale'
import type { SystemCategoryKey } from './category.schema.ts'

/**
 * Display name of a category: the stored name for a user category, the translated name for a
 * system one. A system category has no name of its own: it is translated on every read.
 */
export const categoryName = (row: { name: string | null; systemKey: SystemCategoryKey | null }, locale: Locale) =>
  row.systemKey ? m[`category_${row.systemKey}`]({}, { locale }) : row.name!
