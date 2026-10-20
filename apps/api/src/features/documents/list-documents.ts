import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { SOURCE_TYPES, type SourceRef } from '../accounts/source'
import { document } from './document.schema'
import { toDocumentView } from './upload-document'

export const listDocumentsInput = z
  .object({
    sourceType: z.enum(SOURCE_TYPES).optional().describe('One source only; use with sourceId'),
    sourceId: z.string().min(1).optional(),
  })
  .refine((input) => Boolean(input.sourceType) === Boolean(input.sourceId), {
    message: 'sourceType and sourceId go together',
  })

/** The WHERE of one source's documents, in the three-nullable-FK shape. */
const sourceFilter = (ref: SourceRef) =>
  ref.type === 'product'
    ? eq(document.productId, ref.id)
    : ref.type === 'card'
      ? eq(document.cardId, ref.id)
      : eq(document.cashWalletId, ref.id)

export async function listDocuments(db: Db, userId: string, input: z.infer<typeof listDocumentsInput>) {
  const rows = await db
    .select()
    .from(document)
    .where(
      and(
        eq(document.userId, userId),
        input.sourceType && input.sourceId ? sourceFilter({ type: input.sourceType, id: input.sourceId }) : undefined,
      ),
    )
    .orderBy(desc(document.createdAt))
  return rows.map(toDocumentView)
}
