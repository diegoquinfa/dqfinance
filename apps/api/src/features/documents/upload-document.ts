import { z } from 'zod'
import type { Db } from '../../db'
import { AppError } from '../../shared/http'
import { SOURCE_TYPES, resolveSource, sourceColumns, sourceRefOf } from '../accounts/source'
import { isAllowedDocumentType, MAX_DOCUMENT_BYTES, mediaType } from './document-rules'
import type { DocumentBucket } from './document-bucket'
import { document } from './document.schema'

/** Multipart form of an upload: the file plus the source it belongs to. */
export const uploadDocumentInput = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  sourceId: z.string().min(1),
  name: z.string().trim().max(200).optional(),
  file: z.instanceof(File),
})

export type UploadDocumentInput = z.infer<typeof uploadDocumentInput>

export async function uploadDocument(bucket: DocumentBucket, db: Db, userId: string, input: UploadDocumentInput) {
  const source = await resolveSource(db, userId, { type: input.sourceType, id: input.sourceId })
  const contentType = mediaType(input.file.type)
  if (!isAllowedDocumentType(contentType)) throw new AppError('document_type_not_allowed', 415)
  if (input.file.size > MAX_DOCUMENT_BYTES) throw new AppError('document_too_large', 413)

  const id = crypto.randomUUID()
  // The key never comes from the file name; namespacing by owner keeps one user's objects apart.
  const r2Key = `${userId}/${id}`
  // Object first: an object without a row is invisible, a row without its object is a broken download.
  await bucket.put(r2Key, input.file, { httpMetadata: { contentType } })
  const [row] = await db
    .insert(document)
    .values({
      id,
      userId,
      ...sourceColumns(source.ref),
      name: (input.name ?? input.file.name) || 'document',
      contentType,
      sizeBytes: input.file.size,
      r2Key,
    })
    .returning()
  return toDocumentView(row!)
}

export const toDocumentView = (row: typeof document.$inferSelect) => ({
  id: row.id,
  source: sourceRefOf(row),
  name: row.name,
  contentType: row.contentType,
  sizeBytes: row.sizeBytes,
  createdAt: row.createdAt.toISOString(),
})
