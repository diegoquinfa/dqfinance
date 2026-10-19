import { useState } from 'react'
import { cashAndProducts, findSource, sourceKey, transferDestinations, useSources, type SourceRef } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { useSettings } from '#/features/settings/settings-api'
import { dayToIso, today } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import { useCreateTransfer } from './transfers-api'

function NewTransferForm({ close, defaultFrom, defaultTo }: { close: () => void; defaultFrom?: SourceRef; defaultTo?: SourceRef }) {
  const { sources } = useSources()
  const settings = useSettings()
  const create = useCreateTransfer()
  const [fromKey, setFromKey] = useState(defaultFrom ? sourceKey(defaultFrom) : '')
  const [toKey, setToKey] = useState(defaultTo ? sourceKey(defaultTo) : '')
  const [debtCurrency, setDebtCurrency] = useState('')

  const from = findSource(sources, fromKey)
  const to = findSource(sources, toKey)
  const sameSource = Boolean(from && to && from.key === to.key)
  const receivedCurrency = to?.cardKind === 'credit' ? debtCurrency || to.currency : (to?.currency ?? '')
  const needsReceivedAmount = Boolean(from && to && receivedCurrency && receivedCurrency !== from.currency)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!from || !to || sameSource) return
    const form = new FormData(event.currentTarget)
    const received = String(form.get('receivedAmount'))
    const fee = String(form.get('fee'))
    create.mutate(
      {
        from: from.ref as { type: 'product' | 'cash_wallet'; id: string },
        to: to.ref,
        amount: Number(form.get('amount')),
        receivedAmount: needsReceivedAmount ? Number(received) : undefined,
        debtCurrency: to.cardKind === 'credit' ? receivedCurrency : undefined,
        fee: fee ? Number(fee) : undefined,
        note: String(form.get('note')) || undefined,
        sentAt: dayToIso(String(form.get('date'))),
        inTransit: form.get('inTransit') === 'on',
      },
      {
        onSuccess: () => {
          close()
          toast.success(m.toast_transfer_created())
        },
      },
    )
  }

  if (sources.length < 2) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">{m.transactions_no_sources()}</p>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_close()}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <SourceSelect
          id="transfer-from"
          label={m.label_from()}
          hint={m.transfers_from_hint()}
          options={cashAndProducts(sources)}
          value={fromKey}
          onChange={setFromKey}
        />
        <SourceSelect
          id="transfer-to"
          label={m.label_to()}
          hint={m.transfers_to_hint()}
          options={transferDestinations(sources)}
          value={toKey}
          onChange={setToKey}
        />
        {sameSource && <FieldError>{m.transfers_same_source()}</FieldError>}

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="transfer-amount">{`${m.label_amount()} (${from?.currency ?? ''})`}</FieldLabel>
            <Input
              id="transfer-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              required
              className="tabular-nums"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="transfer-date">{m.label_date()}</FieldLabel>
            <Input id="transfer-date" name="date" type="date" defaultValue={today()} max={today()} required />
          </Field>
        </div>

        {to?.cardKind === 'credit' && (
          <Field>
            <FieldLabel htmlFor="transfer-debt-currency">{m.label_debt_currency()}</FieldLabel>
            <Select value={receivedCurrency} onValueChange={setDebtCurrency}>
              <SelectTrigger id="transfer-debt-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(settings.data?.currencies ?? [to.currency]).map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{m.transfers_debt_currency_hint()}</FieldDescription>
          </Field>
        )}

        {needsReceivedAmount && (
          <Field>
            <FieldLabel htmlFor="transfer-received">{`${m.label_received_amount()} (${receivedCurrency})`}</FieldLabel>
            <Input
              id="transfer-received"
              name="receivedAmount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              required
              className="tabular-nums"
            />
            <FieldDescription>{m.transfers_received_amount_hint()}</FieldDescription>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="transfer-fee">{`${m.label_fee()} (${m.label_optional()})`}</FieldLabel>
          <Input id="transfer-fee" name="fee" type="number" step="0.01" min="0" inputMode="decimal" className="tabular-nums" />
        </Field>

        <Field>
          <FieldLabel htmlFor="transfer-note">{`${m.label_note()} (${m.label_optional()})`}</FieldLabel>
          <Input id="transfer-note" name="note" maxLength={200} />
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="inTransit" className="mt-1 size-4 accent-signal" />
          <span>
            {m.transfers_in_transit()}
            <span className="block text-muted-foreground">{m.transfers_in_transit_hint()}</span>
          </span>
        </label>

        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending || !fromKey || !toKey || sameSource}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.transfers_submit()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function NewTransferDialog({
  trigger,
  defaultFrom,
  defaultTo,
}: {
  trigger: React.ReactNode
  /** Prefills the origin and the destination, like a pocket moving money in and out. */
  defaultFrom?: SourceRef
  defaultTo?: SourceRef
}) {
  return (
    <DialogPanel trigger={trigger} title={m.transfers_new()}>
      {(close) => <NewTransferForm close={close} defaultFrom={defaultFrom} defaultTo={defaultTo} />}
    </DialogPanel>
  )
}
