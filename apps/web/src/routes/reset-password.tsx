import { createFileRoute } from '@tanstack/react-router'
import { FocusLayout } from '#/shared/ui/page'
import { ResetPasswordForm } from '#/features/auth/reset-password-form'

// The router reads a numeric query value as a number; the API wants the raw text.
const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined

// The reset link lands here with `?token=`, or with `?error=` when the link expired.
export const Route = createFileRoute('/reset-password')({
  validateSearch: (search) => ({ token: text(search.token), error: text(search.error) }),
  ssr: false,
  component: () => (
    <FocusLayout>
      <ResetPasswordForm />
    </FocusLayout>
  ),
})
