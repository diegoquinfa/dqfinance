import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { COUNTERPARTY_KINDS, counterparty } from './counterparty.schema'

export const updateCounterpartyInput = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  kind: z.enum(COUNTERPARTY_KINDS).optional(),
})

/** The MCP tool has no path to take the id from, so it carries it in the input. */
export const updateCounterpartyToolInput = updateCounterpartyInput.extend({ id: z.string().min(1) })

/** Renames a contact or changes its kind. A contact of another user is not found. */
export async function updateCounterparty(
  db: Db,
  userId: string,
  id: string,
  input: z.infer<typeof updateCounterpartyInput>,
) {
  const existing = found(
    await db.select().from(counterparty).where(and(eq(counterparty.id, id), eq(counterparty.userId, userId))).get(),
    'counterparty_not_found',
  )
  const changes: { name?: string; kind?: (typeof COUNTERPARTY_KINDS)[number] } = {}
  if (input.name !== undefined) changes.name = input.name
  if (input.kind !== undefined) changes.kind = input.kind
  if (Object.keys(changes).length === 0) return { id: existing.id, name: existing.name, kind: existing.kind }
  const [row] = await db
    .update(counterparty)
    .set(changes)
    .where(and(eq(counterparty.id, id), eq(counterparty.userId, userId)))
    .returning()
  return { id: row!.id, name: row!.name, kind: row!.kind }
}
