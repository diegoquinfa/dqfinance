import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { document } from './document.schema'

/** One owned document row; every read, download and delete starts here. */
export async function findOwnedDocument(db: Db, userId: string, id: string) {
  return found(
    await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .get(),
    'document_not_found',
  )
}
