import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/shared/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Separator } from '#/shared/ui/separator'
import { Spinner } from '#/shared/ui/spinner'
import { authClient, isOAuthFlow } from './auth-client'
import { LocaleSwitch } from './locale-switch'

export function SignInForm() {
  const navigate = useNavigate()
  const { refetch: refetchSession } = authClient.useSession()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    setPending(true)
    setError(undefined)
    let result
    try {
      result = isSignUp
        ? await authClient.signUp.email({ email, password, name: String(form.get('name')) })
        : await authClient.signIn.email({ email, password })
    } catch {
      setPending(false)
      return setError(m.error_network({ url: import.meta.env.VITE_API_URL ?? 'http://localhost:8787' }))
    }
    if (result.error) {
      setPending(false)
      return setError(result.error.message ?? m.error_generic())
    }
    // During an OAuth flow the auth client redirects back to the agent on its own.
    if (isOAuthFlow()) return
    // Refresh the cached session first, or the signed-in shell still sees null and bounces back here.
    await refetchSession()
    void navigate({ to: '/overview' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isSignUp ? m.auth_sign_up_title() : m.auth_sign_in_title({ app: m.app_name() })}
        </CardTitle>
        {isOAuthFlow() && <CardDescription>{m.auth_oauth_notice()}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {isSignUp && (
              <Field>
                <FieldLabel htmlFor="name">{m.label_name()}</FieldLabel>
                <Input id="name" name="name" autoComplete="name" required />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">{m.label_email()}</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{m.label_password()}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
            </Field>
            <FieldError>{error}</FieldError>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending
                ? isSignUp
                  ? m.auth_pending_sign_up()
                  : m.auth_pending_sign_in()
                : isSignUp
                  ? m.auth_submit_sign_up()
                  : m.auth_submit_sign_in()}
            </Button>
            <button
              type="button"
              className="label-mono link-draw self-start text-muted-foreground hover:text-ink"
              onClick={() => setMode(isSignUp ? 'sign-in' : 'sign-up')}
            >
              {isSignUp ? m.auth_switch_to_sign_in() : m.auth_switch_to_sign_up()}
            </button>
            <Separator />
            <LocaleSwitch id="sign-in-language" />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
