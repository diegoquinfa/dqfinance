import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType } from 'hono/client'
import { api, unwrap } from '#/shared/api'

export type SettingsPatch = InferRequestType<typeof api.api.settings.$patch>['json']

export const settingsQuery = queryOptions({
  queryKey: ['settings'],
  queryFn: async () => (await unwrap(api.api.settings.$get())).settings,
})

/** Use in the signed-in shell: null means onboarding has not run yet. */
export function useSettings(options?: { enabled?: boolean }) {
  return useQuery({ ...settingsQuery, enabled: options?.enabled ?? true })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: SettingsPatch) => unwrap(api.api.settings.$patch({ json })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey }),
  })
}
