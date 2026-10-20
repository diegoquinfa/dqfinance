import { useState, type FormEvent } from 'react'
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

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(undefined)
    setPending(true)
    let result
    try {
      result = await authClient.requestPasswordReset({ email: String(form.get('email')) })
    } catch {
      setPending(false)
      return setError(m.error_network({ url: location.origin }))
    }
    setPending(false)
    if (result.error?.code === 'RESET_PASSWORD_DISABLED') return setMessage(m.auth_forgot_password_disabled())
    // A failed request (rate limit, server error) is shown; only success is the same for every address.
    if (result.error) return setError(result.error.message ?? m.error_generic())
    setMessage(m.auth_forgot_password_sent())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.auth_forgot_password_title()}</CardTitle>
      </CardHeader>
      <CardContent>
        {message ? (
          <div className="grid gap-6">
            <p role="status" className="text-sm text-soft">
              {message}
            </p>
            <AuthLink to="/sign-in">{m.auth_link_sign_in()}</AuthLink>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{m.label_email()}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </Field>
              <FieldError>{error}</FieldError>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? m.auth_forgot_password_pending() : m.auth_forgot_password_submit()}
              </Button>
              <AuthLink to="/sign-in">{m.auth_link_sign_in()}</AuthLink>
              <Separator />
              <LocaleSwitch id="forgot-password-language" />
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
