import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import type { DocumentBucket } from './document-bucket'
import { document } from './document.schema'

/** One owned document row; every read, download and delete starts here. */
async function findOwnedDocument(db: Db, userId: string, id: string) {
  return found(
    await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .get(),
    'document_not_found',
  )
}

/** The file and the metadata the download response needs. Ownership is checked before R2 is touched. */
export async function downloadDocument(bucket: DocumentBucket, db: Db, userId: string, id: string) {
  const row = await findOwnedDocument(db, userId, id)
  const object = await bucket.get(row.r2Key)
  if (!object) throw new AppError('document_not_found', 404)
  return { name: row.name, contentType: row.contentType, body: object.body }
}

export async function deleteDocument(bucket: DocumentBucket, db: Db, userId: string, id: string) {
  const row = await findOwnedDocument(db, userId, id)
  // Row first: a leftover object is harmless, a row pointing at a deleted object is a broken download.
  await db.delete(document).where(eq(document.id, row.id))
  await bucket.delete(row.r2Key)
  return { id: row.id }
}
