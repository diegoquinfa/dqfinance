import { createFileRoute } from '@tanstack/react-router'
import { ConsentCard } from '#/features/auth/consent-card'

// OAuth consentPage: Better Auth sends the user here when an MCP client asks for access.
export const Route = createFileRoute('/consent')({
  ssr: false,
  component: () => (
    <main className="grid min-h-dvh place-items-center p-4">
      <ConsentCard />
    </main>
  ),
})
