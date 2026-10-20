import { useState, type FormEvent } from 'react'
import { useSearch } from '@tanstack/react-router'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/shared/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Separator } from '#/shared/ui/separator'
import { Spinner } from '#/shared/ui/spinner'
import { authClient } from './auth-client'
import { AuthLink } from './auth-link'
import { LocaleSwitch } from './locale-switch'
import { MIN_PASSWORD_LENGTH, passwordProblem, passwordProblemMessage } from './password-rule'

export function ResetPasswordForm() {
  const { token, error: linkError } = useSearch({ from: '/reset-password' })
  // Better Auth sends the user back with `?error=INVALID_TOKEN` when the link is no longer good.
  const expired = !token || linkError !== undefined
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  const problem = passwordProblem(password, confirmPassword)
  const repeatError = confirmPassword && problem ? passwordProblemMessage(problem) : undefined
  const ready = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || !token) return
    setPending(true)
    setError(undefined)
    let result
    try {
      // `confirmPassword` is not part of Better Auth's type, but the server checks it before the route runs.
      const body = { newPassword: password, confirmPassword, token }
      result = await authClient.resetPassword(body)
    } catch {
      setPending(false)
      return setError(m.error_network({ url: location.origin }))
    }
    setPending(false)
    if (result.error) return setError(result.error.message ?? m.error_generic())
    setDone(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expired ? m.auth_forgot_password_title() : m.auth_reset_password_title()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {expired ? (
            <>
              <p role="status" className="text-sm text-soft">
                {m.auth_reset_password_invalid()}
              </p>
              <AuthLink to="/forgot-password">{m.auth_reset_password_again()}</AuthLink>
            </>
          ) : done ? (
            <>
              <p role="status" className="text-sm text-soft">
                {m.auth_reset_password_done()}
              </p>
              <AuthLink to="/sign-in">{m.auth_link_sign_in()}</AuthLink>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="newPassword">{m.label_new_password()}</FieldLabel>
                  <Input
                    id="newPassword"
                    name="newPassword"
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
                  {pending ? m.auth_reset_password_pending() : m.auth_reset_password_submit()}
                </Button>
              </FieldGroup>
            </form>
          )}
          <Separator />
          <LocaleSwitch id="reset-password-language" />
        </div>
      </CardContent>
    </Card>
  )
}
