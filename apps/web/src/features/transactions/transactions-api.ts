import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Transaction = InferResponseType<typeof api.api.transactions.$get, 200>[number]
export type NewTransaction = InferRequestType<typeof api.api.transactions.$post>['json']
export type TransactionFilters = InferRequestType<typeof api.api.transactions.$get>['query']
export type TransactionPatch = InferRequestType<(typeof api.api.transactions)[':id']['$patch']>['json']

export const transactionsQuery = (filters: TransactionFilters = { limit: 20 }) =>
  queryOptions({
    queryKey: ['transactions', filters],
    queryFn: async () => unwrap(api.api.transactions.$get({ query: filters })),
  })

export function useTransactions(filters?: TransactionFilters) {
  return useQuery(transactionsQuery(filters))
}

export type SummaryFilters = InferRequestType<typeof api.api.transactions.summary.$get>['query']

/** Income and expense totals per currency, summed by the API (no page limit). */
export function useTransactionSummary(filters: SummaryFilters) {
  return useQuery({
    queryKey: ['transactions', 'summary', filters],
    queryFn: async () => unwrap(api.api.transactions.summary.$get({ query: filters })),
    placeholderData: (previous) => previous,
  })
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

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async ({ id, json }: { id: string; json: TransactionPatch }) =>
      unwrap(api.api.transactions[':id'].$patch({ param: { id }, json })),
    onSuccess: invalidate,
  })
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.transactions[':id'].$delete({ param: { id } })),
    onSuccess: invalidate,
  })
}

export type ImportInput = InferRequestType<typeof api.api.transactions.import.$post>['json']
export type ImportView = InferResponseType<typeof api.api.transactions.import.$post, 200>

/** The dry run of a statement import: what would be recorded, duplicates included. */
export function useImportPreview(input: ImportInput | null) {
  return useQuery({
    queryKey: ['transactions', 'import', input],
    queryFn: async () => unwrap(api.api.transactions.import.$post({ json: input! })),
    enabled: input !== null,
  })
}

/** The real import: the same rows with `dryRun: false`. */
export function useImportTransactions() {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async (json: ImportInput) => unwrap(api.api.transactions.import.$post({ json })),
    onSuccess: invalidate,
  })
}
