import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { authClient } from '#/features/auth/auth-client'
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setPending(true)
    setError(undefined)
    let result
    try {
      result = await authClient.changePassword({
        currentPassword: String(form.get('currentPassword')),
        newPassword: String(form.get('newPassword')),
        revokeOtherSessions: true,
      })
    } catch {
      setPending(false)
      return setError(m.error_network({ url: location.origin }))
    }
    setPending(false)
    if (result.error) return setError(result.error.message ?? m.error_generic())
    formElement.reset()
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
            <Input id="newPassword" name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
            <FieldDescription>{m.password_change_note()}</FieldDescription>
          </Field>
          <FieldError>{error}</FieldError>
          <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_change_password()}
          </Button>
        </FieldGroup>
      </form>
    </Section>
  )
}
