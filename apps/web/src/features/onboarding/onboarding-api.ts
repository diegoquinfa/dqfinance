import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType } from 'hono/client'
import { api, unwrap } from '#/shared/api'
import { settingsQuery } from '../settings/settings-api'
import { invalidateSpending } from '#/shared/invalidate-spending'

export type OnboardingInput = InferRequestType<typeof api.api.onboarding.$post>['json']

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (json: OnboardingInput) => unwrap(api.api.onboarding.$post({ json })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['balances'] })
      invalidateSpending(queryClient)
    },
  })
}
