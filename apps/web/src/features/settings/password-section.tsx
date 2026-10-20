import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { authClient } from '#/features/auth/auth-client'
import { MIN_PASSWORD_LENGTH, passwordProblem, passwordProblemMessage } from '#/features/auth/password-rule'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Section } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'

/** Better Auth asks for the current password; other sessions are revoked, OAuth tokens of agents are not. */
export function PasswordSection() {
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const problem = passwordProblem(newPassword, confirmPassword)
  const repeatError = confirmPassword && problem ? passwordProblemMessage(problem) : undefined
  const ready = newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setPending(true)
    setError(undefined)
    let result
    try {
      // `confirmPassword` is not part of Better Auth's type, but the server checks it before the route runs.
      const body = {
        currentPassword: String(form.get('currentPassword')),
        newPassword,
        confirmPassword,
        revokeOtherSessions: true,
      }
      result = await authClient.changePassword(body)
    } catch {
      setPending(false)
      return setError(m.error_network({ url: location.origin }))
    }
    setPending(false)
    if (result.error) return setError(result.error.message ?? m.error_generic())
    formElement.reset()
    setNewPassword('')
    setConfirmPassword('')
    toast.success(m.toast_password_changed())
  }

  return (
    <Section index="05" label={m.settings_password()}>
      <form onSubmit={onSubmit} className="max-w-sm">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="currentPassword">{m.label_current_password()}</FieldLabel>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="newPassword">{m.label_new_password()}</FieldLabel>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <FieldDescription>{m.password_change_note()}</FieldDescription>
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
          <Button type="submit" variant="outline" disabled={pending || !ready} className="justify-self-start">
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_change_password()}
          </Button>
        </FieldGroup>
      </form>
    </Section>
  )
}
