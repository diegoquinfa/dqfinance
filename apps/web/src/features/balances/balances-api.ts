import { queryOptions, useQuery } from '@tanstack/react-query'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type BalancesView = InferResponseType<typeof api.api.balances.$get, 200>

export type HistoryFilters = InferRequestType<typeof api.api.balances.history.$get>['query']
export type HistoryPoint = InferResponseType<typeof api.api.balances.history.$get, 200>[number]

export const balancesQuery = queryOptions({
  queryKey: ['balances'],
  queryFn: async () => unwrap(api.api.balances.$get()),
})

/** Every balance, card debt and in-transit amount; the API computes them from the movements. */
export function useBalances() {
  return useQuery(balancesQuery)
}

/** Month-end assets and liabilities (and one source's own balance), oldest first. */
export function useBalanceHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ['balances', 'history', filters],
    queryFn: async () => unwrap(api.api.balances.history.$get({ query: filters })),
    placeholderData: (previous) => previous,
  })
}
