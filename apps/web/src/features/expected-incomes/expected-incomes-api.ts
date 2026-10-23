import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'
import { invalidateSpending } from '#/shared/invalidate-spending'

export type ExpectedIncome = InferResponseType<typeof api.api.incomes.$get, 200>[number]
export type NewExpectedIncome = InferRequestType<typeof api.api.incomes.$post>['json']

export const expectedIncomesQuery = queryOptions({
  queryKey: ['expected-incomes'],
  queryFn: async () => unwrap(api.api.incomes.$get()),
})

export function useExpectedIncomes() {
  return useQuery(expectedIncomesQuery)
}

export function useCreateExpectedIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewExpectedIncome) => unwrap(api.api.incomes.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expectedIncomesQuery.queryKey })
      invalidateSpending(queryClient)
    },
  })
}

export function useDeleteExpectedIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.incomes[':id'].$delete({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expectedIncomesQuery.queryKey })
      invalidateSpending(queryClient)
    },
  })
}
