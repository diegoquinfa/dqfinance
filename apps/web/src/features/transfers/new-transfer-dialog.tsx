import { useState, type FormEvent } from 'react'
import { cashAndProducts, findSource, transferDestinations, useSources } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { useSettings } from '#/features/settings/settings-api'
import { dayToIso, today } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FormError } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { useCreateTransfer } from './transfers-api'

function NewTransferForm({ close }: { close: () => void }) {
  const { sources } = useSources()
  const settings = useSettings()
  const create = useCreateTransfer()
  const [fromKey, setFromKey] = useState('')
  const [toKey, setToKey] = useState('')
  const [debtCurrency, setDebtCurrency] = useState('')

  const from = findSource(sources, fromKey)
  const to = findSource(sources, toKey)
  const sameSource = Boolean(from && to && from.key === to.key)
  const receivedCurrency = to?.cardKind === 'credit' ? debtCurrency || to.currency : (to?.currency ?? '')
  const needsReceivedAmount = Boolean(from && to && receivedCurrency && receivedCurrency !== from.currency)

  function submit(event: FormEvent<HTMLFormElement>) {
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
      { onSuccess: close },
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
    <form onSubmit={submit} className="grid gap-4">
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
      {sameSource && (
        <p role="alert" className="text-sm text-destructive">
          {m.transfers_same_source()}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field id="transfer-amount" label={`${m.label_amount()} (${from?.currency ?? ''})`}>
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
        <Field id="transfer-date" label={m.label_date()}>
          <Input id="transfer-date" name="date" type="date" defaultValue={today()} max={today()} required />
        </Field>
      </div>

      {to?.cardKind === 'credit' && (
        <Field id="transfer-debt-currency" label={m.label_debt_currency()} hint={m.transfers_debt_currency_hint()}>
          <NativeSelect
            id="transfer-debt-currency"
            value={receivedCurrency}
            onChange={(event) => setDebtCurrency(event.target.value)}
          >
            {(settings.data?.currencies ?? [to.currency]).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      {needsReceivedAmount && (
        <Field
          id="transfer-received"
          label={`${m.label_received_amount()} (${receivedCurrency})`}
          hint={m.transfers_received_amount_hint()}
        >
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
        </Field>
      )}

      <Field id="transfer-fee" label={`${m.label_fee()} (${m.label_optional()})`}>
        <Input id="transfer-fee" name="fee" type="number" step="0.01" min="0" inputMode="decimal" className="tabular-nums" />
      </Field>

      <Field id="transfer-note" label={`${m.label_note()} (${m.label_optional()})`}>
        <Input id="transfer-note" name="note" maxLength={200} />
      </Field>

      <div className="grid gap-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="inTransit" className="mt-1 size-4 accent-signal" />
          <span>
            {m.transfers_in_transit()}
            <span className="block text-muted-foreground">{m.transfers_in_transit_hint()}</span>
          </span>
        </label>
      </div>

      <FormError message={create.error?.message} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" disabled={create.isPending || !fromKey || !toKey || sameSource}>
          {m.transfers_submit()}
        </Button>
      </div>
    </form>
  )
}

export function NewTransferDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <DialogPanel trigger={trigger} title={m.transfers_new()}>
      {(close) => <NewTransferForm close={close} />}
    </DialogPanel>
  )
}
