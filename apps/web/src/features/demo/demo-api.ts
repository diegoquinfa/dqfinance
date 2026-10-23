import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '#/shared/api'
import { settingsQuery } from '#/features/settings/settings-api'
import { invalidateSpending } from '#/shared/invalidate-spending'

/**
 * The demo ledger. The API writes it once and does nothing after that, so this is safe to
 * call on every load of the app shell.
 */
export function useSeedDemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => await unwrap(api.api.demo.$post()),
    onSuccess: () => {
      invalidateSpending(queryClient)
      return queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey })
    },
  })
}
