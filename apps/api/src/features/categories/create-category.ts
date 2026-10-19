import { z } from 'zod'
import type { Db } from '../../db'
import { CATEGORY_KINDS, category } from './category.schema'

export const createCategoryInput = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(CATEGORY_KINDS),
})

export async function createCategory(db: Db, userId: string, input: z.infer<typeof createCategoryInput>) {
  const [row] = await db.insert(category).values({ userId, ...input }).returning()
  return { id: row!.id, kind: row!.kind, name: row!.name!, system: false }
}
