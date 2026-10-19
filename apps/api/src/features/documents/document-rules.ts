/** Upload rules: PDF and common images, up to 10 MB. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const DOCUMENT_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

/** The bare media type: browsers may send "image/jpeg; charset=binary". */
export const mediaType = (contentType: string) => contentType.split(';')[0]!.trim().toLowerCase()

export const isAllowedDocumentType = (contentType: string) =>
  (DOCUMENT_CONTENT_TYPES as readonly string[]).includes(mediaType(contentType))
