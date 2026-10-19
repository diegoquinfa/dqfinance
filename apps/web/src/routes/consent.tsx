import { createFileRoute } from '@tanstack/react-router'
import { FocusLayout } from '#/shared/ui/page'
import { ConsentCard } from '#/features/auth/consent-card'

// OAuth consentPage: Better Auth sends the user here when an MCP client asks for access.
export const Route = createFileRoute('/consent')({
  ssr: false,
  component: () => (
    <FocusLayout>
      <ConsentCard />
    </FocusLayout>
  ),
})
