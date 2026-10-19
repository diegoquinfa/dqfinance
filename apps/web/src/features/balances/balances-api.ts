import { queryOptions, useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type BalancesView = InferResponseType<typeof api.api.balances.$get, 200>

export const balancesQuery = queryOptions({
  queryKey: ['balances'],
  queryFn: async () => unwrap(api.api.balances.$get()),
})

/** Every balance, card debt and in-transit amount; the API computes them from the movements. */
export function useBalances() {
  return useQuery(balancesQuery)
}
