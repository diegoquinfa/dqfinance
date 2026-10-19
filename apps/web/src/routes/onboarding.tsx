import { createFileRoute, redirect } from '@tanstack/react-router'
import { OnboardingWizard } from '#/features/onboarding/onboarding-wizard'
import { settingsQuery } from '#/features/settings/settings-api'

export const Route = createFileRoute('/onboarding')({
  ssr: false,
  // Resolved once per navigation. A stale cached value must be revalidated, or someone who already
  // onboarded would get the wizard again. Failing here (no session) falls through to the wizard,
  // which redirects to sign-in.
  beforeLoad: async ({ context }) => {
    const settings = await context.queryClient
      .ensureQueryData({ ...settingsQuery, revalidateIfStale: true })
      .catch(() => null)
    if (settings) throw redirect({ to: '/overview' })
  },
  component: OnboardingWizard,
})
