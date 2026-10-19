import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Transaction = InferResponseType<typeof api.api.transactions.$get, 200>[number]
export type NewTransaction = InferRequestType<typeof api.api.transactions.$post>['json']
export type TransactionFilters = InferRequestType<typeof api.api.transactions.$get>['query']

export const transactionsQuery = (filters: TransactionFilters = { limit: 20 }) =>
  queryOptions({
    queryKey: ['transactions', filters],
    queryFn: async () => unwrap(api.api.transactions.$get({ query: filters })),
  })

export function useTransactions(filters?: TransactionFilters) {
  return useQuery(transactionsQuery(filters))
}

/** Recording a movement changes balances too. */
function useInvalidateTransactions() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void queryClient.invalidateQueries({ queryKey: ['balances'] })
  }
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async (json: NewTransaction) => unwrap(api.api.transactions.$post({ json })),
    onSuccess: invalidate,
  })
}
