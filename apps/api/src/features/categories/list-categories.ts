import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import type { Locale } from '../../shared/locale'
import { categoryName } from './category-display'
import { CATEGORY_KINDS, category } from './category.schema'

export const listCategoriesInput = z.object({
  kind: z.enum(CATEGORY_KINDS).optional(),
  // System categories (FX difference, bank fees) are booked automatically; pickers hide them.
  includeSystem: z.boolean().optional(),
})

export async function listCategories(db: Db, userId: string, locale: Locale, input: z.infer<typeof listCategoriesInput> = {}) {
  const rows = await db
    .select()
    .from(category)
    .where(
      and(
        eq(category.userId, userId),
        input.kind ? eq(category.kind, input.kind) : undefined,
        input.includeSystem ? undefined : isNull(category.systemKey),
      ),
    )
    .orderBy(asc(category.createdAt))
  return rows
    // The system key identifies the categories booked automatically, so a caller can match them by
    // key instead of by their translated name.
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      name: categoryName(row, locale),
      systemKey: row.systemKey,
      icon: row.icon,
      color: row.color,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
}
