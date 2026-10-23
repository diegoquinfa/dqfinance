import { queryOptions, useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

/**
 * The server computes these from every movement. A write that moves money refreshes them (see
 * invalidateSpending), so between writes a few minutes old is current and needs no refetch.
 */
const SPENDING_STALE_MS = 5 * 60 * 1000

export type SafeToSpend = InferResponseType<typeof api.api.spending['safe-to-spend']['$get'], 200>

export const safeToSpendQuery = queryOptions({
  queryKey: ['safe-to-spend'],
  queryFn: async () => unwrap(api.api.spending['safe-to-spend'].$get()),
  staleTime: SPENDING_STALE_MS,
})

/** What the user may spend today, in their primary currency. */
export function useSafeToSpend(options?: { enabled?: boolean }) {
  return useQuery({ ...safeToSpendQuery, enabled: options?.enabled ?? true })
}

export type Forecast = InferResponseType<typeof api.api.spending.forecast.$get, 200>

export const forecastQuery = queryOptions({
  queryKey: ['forecast'],
  queryFn: async () => unwrap(api.api.spending.forecast.$get()),
  staleTime: SPENDING_STALE_MS,
})

/** The projected balance of each day until the end of the month. */
export function useForecast(options?: { enabled?: boolean }) {
  return useQuery({ ...forecastQuery, enabled: options?.enabled ?? true })
}
