import { useState } from 'react'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
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
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            adjust.mutate(
              {
                source,
                observedBalance: Number(form.get('observedBalance')),
                // The balance this dialog showed. A card's debt in another currency is not the one
                // on screen, so the guard only applies to the currency the user actually sees.
                expectedBalance:
                  source.type === 'card' && selected !== currency ? undefined : currentBalance,
                currency: currencies.length > 1 ? selected : undefined,
                note: String(form.get('note')) || undefined,
              },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_balance_adjusted())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <p className="text-sm text-muted-foreground">
              {m.label_balance()}: {formatMoney(currentBalance, currency)}
            </p>
            {currencies.length > 1 && (
              <Field>
                <FieldLabel htmlFor="adjust-currency">{m.label_debt_currency()}</FieldLabel>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger id="adjust-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="adjust-observed">{m.label_observed_balance()}</FieldLabel>
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
            <Field>
              <FieldLabel htmlFor="adjust-note">{`${m.label_note()} (${m.label_optional()})`}</FieldLabel>
              <Input id="adjust-note" name="note" maxLength={200} />
            </Field>
            <FieldError>{adjust.error?.message}</FieldError>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {m.action_cancel()}
              </Button>
              <Button type="submit" disabled={adjust.isPending}>
                {adjust.isPending && <Spinner data-icon="inline-start" />}
                {m.action_adjust()}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}
