import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Budget = InferResponseType<typeof api.api.budgets.$get, 200>[number]
export type NewBudget = InferRequestType<typeof api.api.budgets.$post>['json']

export const budgetsQuery = queryOptions({
  queryKey: ['budgets'],
  queryFn: async () => unwrap(api.api.budgets.$get()),
})

export function useBudgets() {
  return useQuery(budgetsQuery)
}

export function useSetBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewBudget) => unwrap(api.api.budgets.$post({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQuery.queryKey }),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.budgets[':id'].$delete({ param: { id } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQuery.queryKey }),
  })
}
