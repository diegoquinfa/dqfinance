import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Category = InferResponseType<typeof api.api.categories.$get, 200>[number]
export type NewCategory = InferRequestType<typeof api.api.categories.$post>['json']
export type UpdateCategory = InferRequestType<(typeof api.api.categories)[':id']['$patch']>['json']
export type DeleteCategory = InferRequestType<(typeof api.api.categories)[':id']['$delete']>['param']
export type MergeCategories = InferRequestType<typeof api.api.categories.merge.$post>['json']

/** System categories are booked automatically, so pickers hide them unless asked for. */
export const categoriesQuery = (kind?: 'expense' | 'income', includeSystem = false) =>
  queryOptions({
    queryKey: ['categories', kind ?? 'all', includeSystem],
    queryFn: async () =>
      unwrap(api.api.categories.$get({ query: { ...(kind ? { kind } : {}), ...(includeSystem ? { includeSystem: true } : {}) } })),
  })

export function useCategories(kind?: 'expense' | 'income', includeSystem = false) {
  return useQuery(categoriesQuery(kind, includeSystem))
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewCategory) => unwrap(api.api.categories.$post({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

/** Renames a category and sets its mark. A null icon or color clears it. */
export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, json }: { id: string; json: UpdateCategory }) =>
      unwrap(api.api.categories[':id'].$patch({ param: { id }, json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

/** Deletes a category. One that still holds movements is refused by the API. */
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: DeleteCategory) => unwrap(api.api.categories[':id'].$delete({ param: { id } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

/** A merge moves movements over, so the transactions change too. */
export function useMergeCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: MergeCategories) => unwrap(api.api.categories.merge.$post({ json })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
