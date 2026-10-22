import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#/shared/ui/card'
import { FieldError } from '#/shared/ui/field'
import { authClient } from './auth-client'

const scopeLabel = (scope: string) =>
  (
    {
      'finance:read': m.consent_scope_finance_read,
      'finance:write': m.consent_scope_finance_write,
      profile: m.consent_scope_profile,
      email: m.consent_scope_email,
      offline_access: m.consent_scope_offline_access,
      openid: m.consent_scope_openid,
    } as Record<string, () => string>
  )[scope]

export function ConsentCard() {
  const params = new URLSearchParams(window.location.search)
  const clientId = params.get('client_id') ?? ''
  // The authorization request is signed by the server, so its redirect URI is the one that
  // will receive the code.
  const requestedRedirectUri = params.get('redirect_uri') ?? ''
  const scopes = (params.get('scope') ?? '').split(' ').filter(scopeLabel)
  const [clientName, setClientName] = useState<string>()
  const [redirectUri, setRedirectUri] = useState<string>()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  // A guest may explore the app, but it never hands its ledger to an agent.
  const { data: session } = authClient.useSession()
  const isGuest = Boolean(session?.user.isAnonymous)

  useEffect(() => {
    void (async () => {
      const { data } = await authClient.oauth2.publicClient({ query: { client_id: clientId } })
      setClientName(data?.client_name ?? undefined)
      const registered = data?.redirect_uris ?? []
      if (registered.length) {
        setRedirectUri(registered[0])
        return
      }
      // The public record hides the redirect URIs, so the auth client is asked for the full one.
      const { data: full } = await authClient.oauth2.getClient({ query: { client_id: clientId } })
      setRedirectUri(full?.redirect_uris?.[0] ?? requestedRedirectUri)
    })()
  }, [clientId, requestedRedirectUri])

  async function decide(accept: boolean) {
    setPending(true)
    // On success Better Auth answers with a redirect back to the agent, which the client follows.
    const { error } = await authClient.oauth2.consent({ accept })
    setPending(false)
    if (error) setError(error.message ?? m.error_generic())
  }

  if (isGuest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{m.consent_guest_title()}</CardTitle>
          <CardDescription>{m.guest_mcp_denied()}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/sign-up">{m.auth_link_sign_up()}</Link>
          </Button>
          <Button asChild>
            <Link to="/">{m.action_back()}</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {m.consent_title({ client: clientName ?? m.consent_unknown_client(), app: m.app_name() })}
        </CardTitle>
        <CardDescription>{m.consent_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* The name is the client's own, so the screen also says where the code goes and who asks. */}
        <dl className="mb-6 grid gap-4">
          {redirectUri ? (
            <div className="grid gap-1">
              <dt className="label-mono text-muted-foreground">{m.consent_redirect_label()}</dt>
              <dd className="label-mono normal-case break-all text-ink">{redirectUri}</dd>
            </div>
          ) : null}
          <div className="grid gap-1">
            <dt className="label-mono text-muted-foreground">{m.consent_client_id_label()}</dt>
            <dd className="label-mono normal-case break-all text-ink">{clientId}</dd>
          </div>
        </dl>
        <ul className="divide-y divide-line border-y border-line text-sm">
          {scopes.map((scope) => (
            <li key={scope} className="flex gap-3 py-3 text-ink">
              <span aria-hidden className="text-signal">
                ✓
              </span>
              {scopeLabel(scope)!()}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <FieldError>{error}</FieldError>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={() => void decide(false)}>
          {m.action_deny()}
        </Button>
        <Button disabled={pending} onClick={() => void decide(true)}>
          {m.action_allow()}
        </Button>
      </CardFooter>
    </Card>
  )
}
