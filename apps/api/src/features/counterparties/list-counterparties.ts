import { and, asc, eq, like } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { COUNTERPARTY_KINDS, counterparty } from './counterparty.schema'

export const listCounterpartiesInput = z.object({
  kind: z.enum(COUNTERPARTY_KINDS).optional(),
  search: z.string().trim().max(80).optional().describe('Case-insensitive name fragment'),
})

export async function listCounterparties(db: Db, userId: string, input: z.infer<typeof listCounterpartiesInput> = {}) {
  return db
    .select({ id: counterparty.id, name: counterparty.name, kind: counterparty.kind })
    .from(counterparty)
    .where(
      and(
        eq(counterparty.userId, userId),
        input.kind ? eq(counterparty.kind, input.kind) : undefined,
        input.search ? like(counterparty.name, `%${input.search}%`) : undefined,
      ),
    )
    .orderBy(asc(counterparty.name))
}
