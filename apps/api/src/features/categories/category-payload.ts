import type { Locale } from '../../shared/locale.ts'
import { categoryName } from './category-display.ts'
import type { CategoryKind, SystemCategoryKey } from './category.schema.ts'

/**
 * A category as the API returns it: the system key identifies the ones booked automatically, so a
 * caller can match them by key instead of by their translated name.
 */
export const toCategory = (
  row: { id: string; kind: CategoryKind; name: string | null; systemKey: SystemCategoryKey | null },
  locale: Locale,
) => ({ id: row.id, kind: row.kind, name: categoryName(row, locale), systemKey: row.systemKey })
