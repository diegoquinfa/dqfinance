import { queryOptions, useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type SafeToSpend = InferResponseType<typeof api.api.spending['safe-to-spend']['$get'], 200>

export const safeToSpendQuery = queryOptions({
  queryKey: ['safe-to-spend'],
  queryFn: async () => unwrap(api.api.spending['safe-to-spend'].$get()),
})

/** What the user may spend today, in their primary currency. */
export function useSafeToSpend(options?: { enabled?: boolean }) {
  return useQuery({ ...safeToSpendQuery, enabled: options?.enabled ?? true })
}
