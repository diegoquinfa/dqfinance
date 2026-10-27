import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType } from 'hono/client'
import { api, unwrap } from '#/shared/api'
import { invalidateSpending } from '#/shared/invalidate-spending'

export type NewCardStatement = InferRequestType<(typeof api.api)['card-statements']['$post']>['json']

/** Records what a card's statement asks for; the same cut again replaces it. */
export function useRecordCardStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewCardStatement) => unwrap(api.api['card-statements'].$post({ json })),
    onSuccess: () => invalidateSpending(queryClient),
  })
}
