import { useEffect, useState } from 'react'
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
  const scopes = (params.get('scope') ?? '').split(' ').filter(scopeLabel)
  const [clientName, setClientName] = useState<string>()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    void authClient.oauth2.publicClient({ query: { client_id: clientId } }).then(({ data }) => {
      setClientName(data?.client_name ?? undefined)
    })
  }, [clientId])

  async function decide(accept: boolean) {
    setPending(true)
    // On success Better Auth answers with a redirect back to the agent, which the client follows.
    const { error } = await authClient.oauth2.consent({ accept })
    setPending(false)
    if (error) setError(error.message ?? m.error_generic())
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
