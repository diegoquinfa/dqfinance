import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Spinner } from '#/shared/ui/spinner'
import { authClient } from '#/features/auth/auth-client'
import { useSeedDemo } from './demo-api'

/**
 * "Try the demo": signs the visitor in as a guest and fills the app with sample data.
 *
 * The guest is a real user with no email the person owns, so the app needs no special case.
 * What the guest cannot do is connect an AI agent (see the MCP guard).
 */
export function DemoButton({ variant = 'default' }: { variant?: 'default' | 'outline' }) {
  const navigate = useNavigate()
  const seed = useSeedDemo()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function start() {
    setPending(true)
    setError(undefined)
    const { error: signInError } = await authClient.signIn.anonymous()
    if (signInError) {
      setPending(false)
      return setError(signInError.message ?? m.error_generic())
    }
    try {
      await seed.mutateAsync()
    } catch (cause) {
      setPending(false)
      return setError(cause instanceof Error ? cause.message : m.error_generic())
    }
    setPending(false)
    // The app shell reads the session from the cookie, so it finds the guest on its own.
    void navigate({ to: '/overview' })
  }

  return (
    <div className="grid gap-2">
      <Button variant={variant} disabled={pending} onClick={() => void start()}>
        {pending && <Spinner />}
        {pending ? m.landing_cta_demo_pending() : m.landing_cta_demo()}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
