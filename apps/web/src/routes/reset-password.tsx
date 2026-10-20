import { createFileRoute } from '@tanstack/react-router'
import { FocusLayout } from '#/shared/ui/page'
import { ResetPasswordForm } from '#/features/auth/reset-password-form'

// The reset link lands here with `?token=`, or with `?error=` when the link expired.
export const Route = createFileRoute('/reset-password')({
  ssr: false,
  component: () => (
    <FocusLayout>
      <ResetPasswordForm />
    </FocusLayout>
  ),
})
