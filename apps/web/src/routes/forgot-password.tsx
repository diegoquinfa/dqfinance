import { createFileRoute } from '@tanstack/react-router'
import { FocusLayout } from '#/shared/ui/page'
import { ForgotPasswordForm } from '#/features/auth/forgot-password-form'

export const Route = createFileRoute('/forgot-password')({
  ssr: false,
  component: () => (
    <FocusLayout>
      <ForgotPasswordForm />
    </FocusLayout>
  ),
})
