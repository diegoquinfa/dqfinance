import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { CATEGORY_ICONS, PALETTE_COLORS } from '../../shared/appearance'
import { AppError, found } from '../../shared/http'
import { category } from './category.schema'

export const updateCategoryInput = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  // null clears the mark; the category keeps working without one.
  icon: z.enum(CATEGORY_ICONS).nullish(),
  color: z.enum(PALETTE_COLORS).nullish(),
})

/** The MCP tool has no path to take the id from, so it carries it in the input. */
export const updateCategoryToolInput = updateCategoryInput.extend({ id: z.string().min(1) })

/**
 * Renames a category and sets its mark. The kind does not change: the movements booked under it
 * would no longer agree with it. A category of another user is not found.
 */
export async function updateCategory(
  db: Db,
  userId: string,
  id: string,
  input: z.infer<typeof updateCategoryInput>,
) {
  const existing = found(
    await db.select().from(category).where(and(eq(category.id, id), eq(category.userId, userId))).get(),
    'category_not_found',
  )
  // System categories are booked automatically and their name is translated on every read.
  if (existing.systemKey) throw new AppError('category_system')
  const changes: {
    name?: string
    icon?: (typeof CATEGORY_ICONS)[number] | null
    color?: (typeof PALETTE_COLORS)[number] | null
  } = {}
  if (input.name !== undefined) changes.name = input.name
  if (input.icon !== undefined) changes.icon = input.icon
  if (input.color !== undefined) changes.color = input.color
  if (Object.keys(changes).length === 0) {
    return { id: existing.id, kind: existing.kind, name: existing.name!, icon: existing.icon, color: existing.color }
  }
  const [row] = await db
    .update(category)
    .set(changes)
    .where(and(eq(category.id, id), eq(category.userId, userId)))
    .returning()
  return { id: row!.id, kind: row!.kind, name: row!.name!, icon: row!.icon, color: row!.color }
}
