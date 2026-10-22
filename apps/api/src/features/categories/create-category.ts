import { z } from 'zod'
import type { Db } from '../../db'
import { CATEGORY_ICONS, PALETTE_COLORS } from '../../shared/appearance'
import { CATEGORY_KINDS, category } from './category.schema'

export const createCategoryInput = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(CATEGORY_KINDS),
  // The mark is presentation only: the category works without one.
  icon: z.enum(CATEGORY_ICONS).nullish(),
  color: z.enum(PALETTE_COLORS).nullish(),
})

export async function createCategory(db: Db, userId: string, input: z.infer<typeof createCategoryInput>) {
  const [row] = await db
    .insert(category)
    .values({ userId, ...input, icon: input.icon ?? null, color: input.color ?? null })
    .returning()
  return { id: row!.id, kind: row!.kind, name: row!.name!, systemKey: null, icon: row!.icon, color: row!.color }
}
