import { createFileRoute } from '@tanstack/react-router'
import { FocusLayout } from '#/shared/ui/page'
import { SignUpForm } from '#/features/auth/sign-up-form'

export const Route = createFileRoute('/sign-up')({
  ssr: false,
  component: () => (
    <FocusLayout>
      <SignUpForm />
    </FocusLayout>
  ),
})
