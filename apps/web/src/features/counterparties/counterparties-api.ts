import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Counterparty = InferResponseType<typeof api.api.counterparties.$get, 200>[number]
export type NewCounterparty = InferRequestType<typeof api.api.counterparties.$post>['json']

export const counterpartiesQuery = queryOptions({
  queryKey: ['counterparties'],
  queryFn: async () => unwrap(api.api.counterparties.$get({ query: {} })),
})

export function useCounterparties() {
  return useQuery(counterpartiesQuery)
}

export function useCreateCounterparty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewCounterparty) => unwrap(api.api.counterparties.$post({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: counterpartiesQuery.queryKey }),
  })
}
