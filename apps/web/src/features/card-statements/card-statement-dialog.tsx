import type * as React from 'react'
import { toast } from 'sonner'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Spinner } from '#/shared/ui/spinner'
import { useRecordCardStatement } from './card-statements-api'

/**
 * What a credit card's statement asks for after a cut (design D16). The dates start at the card's
 * last cut and its payment day; recording the same cut again replaces the payment.
 */
export function CardStatementDialog({
  trigger,
  cardId,
  cardName,
  closedOn,
  dueOn,
  payment,
}: {
  trigger: React.ReactNode
  cardId: string
  cardName: string
  closedOn: string | null
  dueOn: string | null
  payment?: number
}) {
  const record = useRecordCardStatement()

  return (
    <DialogPanel trigger={trigger} title={cardName} description={m.statement_hint()}>
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            record.mutate(
              {
                cardId,
                payment: Number(form.get('payment')),
                closedOn: String(form.get('closedOn')),
                dueOn: String(form.get('dueOn')),
              },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.statement_saved())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="statement-payment">{m.statement_payment()}</FieldLabel>
              <Input
                id="statement-payment"
                name="payment"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={payment}
                required
                autoFocus
                className="tabular-nums"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="statement-closed-on">{m.statement_closed_on()}</FieldLabel>
                <Input id="statement-closed-on" name="closedOn" type="date" defaultValue={closedOn ?? ''} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="statement-due-on">{m.statement_due_on()}</FieldLabel>
                <Input id="statement-due-on" name="dueOn" type="date" defaultValue={dueOn ?? ''} required />
              </Field>
            </div>
            <FieldError>{record.error?.message}</FieldError>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {m.action_cancel()}
              </Button>
              <Button type="submit" disabled={record.isPending}>
                {record.isPending && <Spinner data-icon="inline-start" />}
                {m.action_save()}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}
