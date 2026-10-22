import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Webhook = InferResponseType<typeof api.api.webhooks.$get, 200>[number]
export type NewWebhook = InferRequestType<typeof api.api.webhooks.$post>['json']

export const webhooksQuery = queryOptions({
  queryKey: ['webhooks'],
  queryFn: async () => unwrap(api.api.webhooks.$get()),
})

export function useWebhooks() {
  return useQuery(webhooksQuery)
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewWebhook) => unwrap(api.api.webhooks.$post({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksQuery.queryKey }),
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.webhooks[':id'].$delete({ param: { id } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksQuery.queryKey }),
  })
}

/** Announces the bills that fall due inside the lead time the user set. */
export function useCheckDueBills() {
  return useMutation({
    mutationFn: async () => unwrap(api.api.webhooks.check.$post()),
  })
}
