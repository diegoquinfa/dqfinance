import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Category = InferResponseType<typeof api.api.categories.$get, 200>[number]
export type NewCategory = InferRequestType<typeof api.api.categories.$post>['json']

export const categoriesQuery = (kind?: 'expense' | 'income') =>
  queryOptions({
    queryKey: ['categories', kind ?? 'all'],
    queryFn: async () => unwrap(api.api.categories.$get({ query: kind ? { kind } : {} })),
  })

export function useCategories(kind?: 'expense' | 'income') {
  return useQuery(categoriesQuery(kind))
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewCategory) => unwrap(api.api.categories.$post({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}
