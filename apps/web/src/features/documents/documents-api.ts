import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap, unwrapBlob } from '#/shared/api'
import type { SourceRef } from '../accounts/sources'

export type SourceDocument = InferResponseType<typeof api.api.documents.$get, 200>[number]

/** The API's limit and accepted types, so the picker never sends what the API will refuse. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'

export const documentsQuery = (source: SourceRef) =>
  queryOptions({
    queryKey: ['documents', source.type, source.id],
    queryFn: async () =>
      unwrap(api.api.documents.$get({ query: { sourceType: source.type, sourceId: source.id } })),
  })

export const useDocuments = (source: SourceRef) => useQuery(documentsQuery(source))

function useInvalidateDocuments(source: SourceRef) {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['documents', source.type, source.id] })
}

export function useUploadDocument(source: SourceRef) {
  const invalidate = useInvalidateDocuments(source)
  return useMutation({
    mutationFn: async ({ file, name }: { file: File; name?: string }) =>
      unwrap(
        api.api.documents.$post({
          form: { sourceType: source.type, sourceId: source.id, name: name || undefined, file },
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteDocument(source: SourceRef) {
  const invalidate = useInvalidateDocuments(source)
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.documents[':id'].$delete({ param: { id } })),
    onSuccess: invalidate,
  })
}

/** The file itself: the response is the attachment, not JSON. */
export const downloadDocument = (id: string) => unwrapBlob(api.api.documents[':id'].$get({ param: { id } }))
