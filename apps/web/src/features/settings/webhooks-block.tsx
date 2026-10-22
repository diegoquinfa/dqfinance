import { useState } from 'react'
import { m } from '#/shared/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/shared/ui/alert-dialog'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Empty, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Section, rowsClass } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import { useSettings, useUpdateSettings } from './settings-api'
import { useCreateWebhook, useDeleteWebhook, useWebhooks, type Webhook } from './webhooks-api'

/** How early the app warns before a bill falls due. Zero turns the warning off. */
function LeadDaysField() {
  const settings = useSettings()
  const update = useUpdateSettings()
  // The draft is what the user typed; the saved setting is what the server holds.
  const [draft, setDraft] = useState<number | null>(null)
  const days = draft ?? settings.data?.reminderLeadDays ?? 0

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="webhooks-lead-days">{m.webhooks_lead_days()}</FieldLabel>
      <Input
        id="webhooks-lead-days"
        type="number"
        min={0}
        max={60}
        step={1}
        inputMode="numeric"
        value={days}
        onChange={(event) => {
          const next = Number(event.target.value)
          setDraft(next)
          // A refused change falls back to the saved setting, so the field never lies.
          update.mutate(
            { reminderLeadDays: next },
            { onError: () => setDraft(null) },
          )
        }}
        className="max-w-32 tabular-nums"
      />
      <FieldDescription>{m.webhooks_lead_days_hint()}</FieldDescription>
      <p className="label-mono text-muted-foreground">{m.webhooks_lead_days_days({ days })}</p>
      <FieldError>{update.error?.message}</FieldError>
    </Field>
  )
}

/** Where the app calls, and the secret it signs the call with. */
function NewWebhookForm({ close }: { close: () => void }) {
  const create = useCreateWebhook()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    create.mutate(
      { url: String(form.get('url')), secret: String(form.get('secret')) },
      {
        onSuccess: () => {
          close()
          toast.success(m.webhooks_created())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="webhooks-url">{m.webhooks_url()}</FieldLabel>
          <Input id="webhooks-url" name="url" type="url" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="webhooks-secret">{m.webhooks_secret()}</FieldLabel>
          <Input id="webhooks-secret" name="secret" type="password" minLength={8} required autoComplete="off" />
          <FieldDescription>{m.webhooks_secret_hint()}</FieldDescription>
        </Field>
        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.action_save()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** One hook: where the app calls, and the tail of the secret that signs the call. */
function WebhookRow({ hook }: { hook: Webhook }) {
  const remove = useDeleteWebhook()

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="grid gap-1">
        <p className="break-all text-ink">{hook.url}</p>
        <p className="label-mono text-muted-foreground">{m.webhooks_secret_last4({ last4: hook.secretLast4 })}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={remove.isPending}>
            {m.action_delete()}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.action_delete()}</AlertDialogTitle>
            <AlertDialogDescription>{m.webhooks_delete_hint()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => remove.mutate(hook.id, { onSuccess: () => toast.success(m.webhooks_deleted()) })}
            >
              {m.action_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

/** The places the app calls, and how early it warns before a bill falls due. */
export function WebhooksBlock() {
  const webhooks = useWebhooks()

  return (
    <Section
      index="06"
      label={m.webhooks_title()}
      action={
        <DialogPanel trigger={<Button variant="link">{m.webhooks_add()}</Button>} title={m.webhooks_add()}>
          {(close) => <NewWebhookForm close={close} />}
        </DialogPanel>
      }
    >
      <div className="grid gap-8">
        <p className="text-sm text-muted-foreground">{m.webhooks_hint()}</p>

        <LeadDaysField />

        {webhooks.isPending ? (
          <ListSkeleton rows={3} />
        ) : webhooks.error ? (
          <p role="alert" className="text-sm text-destructive">
            {webhooks.error.message}
          </p>
        ) : webhooks.data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.webhooks_empty()}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className={rowsClass}>
            {webhooks.data.map((hook) => (
              <WebhookRow key={hook.id} hook={hook} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}
