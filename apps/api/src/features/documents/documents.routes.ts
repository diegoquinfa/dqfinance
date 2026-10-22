import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { formBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { deleteDocument, downloadDocument } from './document-storage'
import { listDocuments, listDocumentsInput } from './list-documents'
import { uploadDocument, uploadDocumentInput } from './upload-document'

export const documentsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listDocumentsInput), async (c) =>
    c.json(await listDocuments(c.var.db, c.var.userId, c.req.valid('query'))),
  )
  .post('/', formBody(uploadDocumentInput), async (c) =>
    c.json(await uploadDocument(c.env.DOCUMENTS, c.var.db, c.var.userId, c.req.valid('form')), 201),
  )
  .get('/:id', async (c) => {
    const file = await downloadDocument(c.env.DOCUMENTS, c.var.db, c.var.userId, c.req.param('id'))
    return c.body(file.body, 200, {
      'content-type': file.contentType,
      // Always an attachment: an uploaded file must never render in the API's origin.
      'content-disposition': contentDisposition(file.name),
    })
  })
  .delete('/:id', async (c) =>
    c.json(await deleteDocument(c.env.DOCUMENTS, c.var.db, c.var.userId, c.req.param('id'))),
  )

/**
 * The download name in both forms: the plain one keeps only ASCII letters, digits, dots,
 * dashes and spaces, so no parser trips over it, and the encoded one carries the real name.
 */
function contentDisposition(name: string) {
  const limited = [...name].slice(0, 120).join('')
  const ascii = limited.replace(/[^A-Za-z0-9._ -]/g, '').trim() || 'document'
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(limited)}`
}
