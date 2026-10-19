import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Transfer = InferResponseType<typeof api.api.transfers.$get, 200>[number]
export type NewTransfer = InferRequestType<typeof api.api.transfers.$post>['json']
export type TransferFilters = InferRequestType<typeof api.api.transfers.$get>['query']

export const transfersQuery = (filters: TransferFilters = {}) =>
  queryOptions({
    queryKey: ['transfers', filters],
    queryFn: async () => unwrap(api.api.transfers.$get({ query: filters })),
  })

export function useTransfers(filters?: TransferFilters) {
  return useQuery(transfersQuery(filters))
}

function useInvalidateTransfers() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['transfers'] })
    void queryClient.invalidateQueries({ queryKey: ['balances'] })
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }
}

export function useCreateTransfer() {
  const invalidate = useInvalidateTransfers()
  return useMutation({
    mutationFn: async (json: NewTransfer) => unwrap(api.api.transfers.$post({ json })),
    onSuccess: invalidate,
  })
}

export function useMarkTransferReceived() {
  const invalidate = useInvalidateTransfers()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.transfers[':id'].received.$post({ param: { id }, json: {} })),
    onSuccess: invalidate,
  })
}
