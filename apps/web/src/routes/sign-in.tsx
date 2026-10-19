import { createFileRoute } from '@tanstack/react-router'
import { FocusLayout } from '#/shared/ui/page'
import { SignInForm } from '#/features/auth/sign-in-form'

// Also the OAuth loginPage for MCP clients (see apps/api features/auth/auth.ts).
export const Route = createFileRoute('/sign-in')({
  ssr: false,
  component: () => (
    // The panel title carries the logo here, so the corner one would repeat it.
    <FocusLayout logo={false}>
      <SignInForm />
    </FocusLayout>
  ),
})
