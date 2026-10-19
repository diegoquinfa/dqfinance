import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Counterparty = InferResponseType<typeof api.api.counterparties.$get, 200>[number]
export type NewCounterparty = InferRequestType<typeof api.api.counterparties.$post>['json']
export type CounterpartyKind = Counterparty['kind']
export type CounterpartyPatch = InferRequestType<(typeof api.api.counterparties)[':id']['$patch']>['json']
/** One contact in full: its totals, the categories it moved money for and the monthly series. */
export type CounterpartyDetail = InferResponseType<typeof api.api.counterparties[':id']['$get'], 200>

/** The list is filtered by the server: the kind chip and the search term go with the request. */
export type CounterpartyFilters = { kind?: CounterpartyKind; search?: string }

export const counterpartiesQuery = (filters: CounterpartyFilters = {}) =>
  queryOptions({
    queryKey: ['counterparties', filters],
    queryFn: async () => unwrap(api.api.counterparties.$get({ query: filters })),
  })

export function useCounterparties(filters: CounterpartyFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({ ...counterpartiesQuery(filters), enabled: options?.enabled })
}

export function useCreateCounterparty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: NewCounterparty) => unwrap(api.api.counterparties.$post({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['counterparties'] }),
  })
}

/** Renames a contact or changes its kind. */
export function useUpdateCounterparty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, json }: { id: string; json: CounterpartyPatch }) =>
      unwrap(api.api.counterparties[':id'].$patch({ param: { id }, json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['counterparties'] }),
  })
}

/** One contact with its breakdown and its monthly series, inside the period. */
export function useCounterparty(id: string, filters: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['counterparties', id, filters],
    queryFn: async () => unwrap(api.api.counterparties[':id'].$get({ param: { id }, query: filters })),
    enabled: Boolean(id),
  })
}

/** Deletes a contact. The API answers with the deleted row, so this one goes through `unwrap` too. */
export function useDeleteCounterparty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(api.api.counterparties[':id'].$delete({ param: { id } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['counterparties'] }),
  })
}
