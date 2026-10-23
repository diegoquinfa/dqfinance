import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'
import { invalidateSpending } from '#/shared/invalidate-spending'

export type RecurringExpense = InferResponseType<typeof api.api['recurring-expenses']['$get'], 200>[number]
export type NewRecurringExpense = InferRequestType<typeof api.api['recurring-expenses']['$post']>['json']

export const recurringExpensesQuery = (pending = false) =>
  queryOptions({
    queryKey: ['recurring-expenses', pending],
    queryFn: async () => unwrap(api.api['recurring-expenses'].$get({ query: { pending } })),
  })

export function useRecurringExpenses(pending = false) {
  return useQuery(recurringExpensesQuery(pending))
}

function useInvalidateRecurring() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] })
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void queryClient.invalidateQueries({ queryKey: ['balances'] })
    invalidateSpending(queryClient)
  }
}

export function useCreateRecurringExpense() {
  const invalidate = useInvalidateRecurring()
  return useMutation({
    mutationFn: async (json: NewRecurringExpense) => unwrap(api.api['recurring-expenses'].$post({ json })),
    onSuccess: invalidate,
  })
}

/** Records this occurrence as a real expense (the "to confirm" inbox). */
export function useConfirmRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount?: number }) =>
      unwrap(api.api['recurring-expenses'][':id'].confirm.$post({ param: { id }, json: { amount } })),
    onSuccess: invalidate,
  })
}

/** Skips this occurrence without recording anything. */
export function useSkipRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api['recurring-expenses'][':id'].skip.$post({ param: { id } })),
    onSuccess: invalidate,
  })
}

export function useDeleteRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api['recurring-expenses'][':id'].$delete({ param: { id } })),
    onSuccess: invalidate,
  })
}
