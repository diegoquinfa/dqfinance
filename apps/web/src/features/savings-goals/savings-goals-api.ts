import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type SavingsGoal = InferResponseType<typeof api.api.savings.$get, 200>[number]
export type NewSavingsGoal = InferRequestType<typeof api.api.savings.$post>['json']
export type SavingsContribution = InferRequestType<typeof api.api.savings.contributions.$post>['json']

export const savingsGoalsQuery = queryOptions({
  queryKey: ['savings-goals'],
  queryFn: async () => unwrap(api.api.savings.$get()),
})

export function useSavingsGoals() {
  return useQuery(savingsGoalsQuery)
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewSavingsGoal) => unwrap(api.api.savings.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalsQuery.queryKey })
      queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] })
    },
  })
}

export function useAddSavingsContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: SavingsContribution) => unwrap(api.api.savings.contributions.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalsQuery.queryKey })
      queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] })
    },
  })
}

/** Marks a reached goal as celebrated, so the app does not celebrate it again. */
export function useCelebrateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.savings[':id'].celebrate.$post({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalsQuery.queryKey })
    },
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.savings[':id'].$delete({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalsQuery.queryKey })
      queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] })
    },
  })
}
