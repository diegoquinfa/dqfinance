import { useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type Calendar = InferResponseType<typeof api.api.calendar.$get, 200>

/** Per day: what moved and which recurring expenses fall due, summed by the API in the user's timezone. */
export function useCalendar(range: { from: string; to: string }) {
  return useQuery({
    // Under 'transactions': recording, editing or confirming anything already invalidates that key.
    queryKey: ['transactions', 'calendar', range],
    queryFn: async () => unwrap(api.api.calendar.$get({ query: range })),
    placeholderData: (previous) => previous,
  })
}
