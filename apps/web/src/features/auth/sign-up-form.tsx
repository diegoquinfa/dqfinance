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
import { AuthLink } from './auth-link'
import { LocaleSwitch } from './locale-switch'
import { MIN_PASSWORD_LENGTH, passwordProblem, passwordProblemMessage } from './password-rule'

export function SignUpForm() {
  const navigate = useNavigate()
  const { refetch: refetchSession } = authClient.useSession()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const problem = passwordProblem(password, confirmPassword)
  const repeatError = confirmPassword && problem ? passwordProblemMessage(problem) : undefined
  const ready = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(undefined)
    let result
    try {
      // `confirmPassword` is not part of Better Auth's type, but the server checks it before the route runs.
      const body = { name: String(form.get('name')), email: String(form.get('email')), password, confirmPassword }
      result = await authClient.signUp.email(body)
    } catch {
      setPending(false)
      return setError(m.error_network({ url: location.origin }))
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
        <CardTitle>{m.auth_sign_up_title()}</CardTitle>
        {isOAuthFlow() && <CardDescription>{m.auth_oauth_notice()}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{m.label_name()}</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
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
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
            <Field data-invalid={Boolean(repeatError)}>
              <FieldLabel htmlFor="confirmPassword">{m.label_repeat_password()}</FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-invalid={Boolean(repeatError)}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              {repeatError && <FieldError>{repeatError}</FieldError>}
            </Field>
            <FieldError>{error}</FieldError>
            <Button type="submit" disabled={pending || !ready}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? m.auth_pending_sign_up() : m.auth_submit_sign_up()}
            </Button>
            <AuthLink to="/sign-in">{m.auth_link_sign_in()}</AuthLink>
            <Separator />
            <LocaleSwitch id="sign-up-language" />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
