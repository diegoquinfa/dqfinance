import type { QueryClient } from '@tanstack/react-query'

/**
 * The forecast and the safe-to-spend number are cached for minutes, so every write that moves money,
 * a bill, a balance or an income refreshes them here, next to the lists it already refreshes.
 */
export function invalidateSpending(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['forecast'] })
  void queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] })
}
