import { createFileRoute } from '@tanstack/react-router'
import { SignInForm } from '#/features/auth/sign-in-form'

// Also the OAuth loginPage for MCP clients (see apps/api features/auth/auth.ts).
export const Route = createFileRoute('/sign-in')({
  ssr: false,
  component: () => (
    <main className="grid min-h-dvh place-items-center p-4">
      <SignInForm />
    </main>
  ),
})
