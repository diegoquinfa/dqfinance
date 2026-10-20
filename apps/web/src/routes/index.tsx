import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '#/features/landing/landing-page'

// The signed-out home. A signed-in visitor goes straight to the app, as before.
export const Route = createFileRoute('/')({
  component: LandingPage,
})
