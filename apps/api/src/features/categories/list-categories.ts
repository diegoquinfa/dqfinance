import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import type { Locale } from '../../shared/locale'
import { CATEGORY_KINDS, category } from './category.schema'
import { toCategory } from './category-payload'

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
    .map((row) => toCategory(row, locale))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
}
