import { useState, type FormEvent } from 'react'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FormError } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { useAdjustBalance } from './accounts-api'
import type { SourceRef } from './sources'

/**
 * "Edit balance": the user types the real balance and we record the difference.
 * Movements are never rewritten (design D2), so the correction stays explainable.
 */
export function AdjustBalanceDialog({
  ref: source,
  name,
  currency,
  currentBalance,
  debtCurrencies,
}: {
  ref: SourceRef
  name: string
  currency: string
  currentBalance: number
  /** Credit cards only: the debt currencies that can be adjusted. */
  debtCurrencies?: string[]
}) {
  const adjust = useAdjustBalance()
  const currencies = debtCurrencies?.length ? debtCurrencies : [currency]
  const [selected, setSelected] = useState(currencies[0]!)

  return (
    <DialogPanel
      trigger={<Button variant="outline">{m.accounts_adjust_title()}</Button>}
      title={`${m.accounts_adjust_title()} · ${name}`}
      description={m.accounts_adjust_description()}
    >
      {(close) => (
        <form
          className="grid gap-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            adjust.mutate(
              {
                source,
                observedBalance: Number(form.get('observedBalance')),
                currency: currencies.length > 1 ? selected : undefined,
                note: String(form.get('note')) || undefined,
              },
              { onSuccess: close },
            )
          }}
        >
          <p className="text-sm text-muted-foreground">
            {m.label_balance()}: {formatMoney(currentBalance, selected)}
          </p>
          {currencies.length > 1 && (
            <Field id="adjust-currency" label={m.label_debt_currency()}>
              <NativeSelect id="adjust-currency" value={selected} onChange={(event) => setSelected(event.target.value)}>
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field id="adjust-observed" label={m.label_observed_balance()}>
            <Input
              id="adjust-observed"
              name="observedBalance"
              type="number"
              step="0.01"
              inputMode="decimal"
              required
              autoFocus
            />
          </Field>
          <Field id="adjust-note" label={`${m.label_note()} (${m.label_optional()})`}>
            <Input id="adjust-note" name="note" maxLength={200} />
          </Field>
          <FormError message={adjust.error?.message} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              {m.action_cancel()}
            </Button>
            <Button type="submit" disabled={adjust.isPending}>
              {m.action_adjust()}
            </Button>
          </div>
        </form>
      )}
    </DialogPanel>
  )
}
