import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUpdateSettings } from '#/features/settings/settings-api'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Eyebrow } from '#/shared/ui/page'
import { Field, FieldError, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Spinner } from '#/shared/ui/spinner'
import { useSafeToSpend } from './spending-api'

/** The cap the user set for the month, and the way to change it. */
function TargetDialog({ target, currency }: { target: number | null; currency: string }) {
  const [open, setOpen] = useState(false)
  const update = useUpdateSettings()
  const queryClient = useQueryClient()

  const save = (value: number | null) =>
    update.mutate(
      { spendingTarget: value },
      {
        onSuccess: () => {
          setOpen(false)
          queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] })
          toast.success(value === null ? m.spending_target_cleared() : m.spending_target_saved())
        },
      },
    )

  return (
    <DialogPanel
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" size="sm">
          {m.spending_set_target()}
        </Button>
      }
      title={m.spending_target()}
      description={m.spending_target_hint()}
    >
      {(close) => (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const value = String(form.get('target') ?? '').trim()
            save(value === '' ? null : Number(value))
          }}
        >
          <Field>
            <FieldLabel htmlFor="spending-target">{m.spending_target()}</FieldLabel>
            <Input
              id="spending-target"
              name="target"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder={formatMoney(0, currency)}
              defaultValue={target ?? ''}
              autoFocus
            />
          </Field>
          <FieldError>{update.error?.message}</FieldError>
          <div className="flex justify-end gap-2">
            {target !== null && (
              <Button type="button" variant="ghost" disabled={update.isPending} onClick={() => save(null)}>
                {m.action_clear()}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={close}>
              {m.action_cancel()}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Spinner data-icon="inline-start" />}
              {m.action_save()}
            </Button>
          </div>
        </form>
      )}
    </DialogPanel>
  )
}

/**
 * The number the user checks most: how much may I spend today. The money in hand, the bills still
 * due and the days left in the month, and the cap the user set.
 */
export function SafeToSpendCard() {
  const safe = useSafeToSpend()
  if (safe.isPending) return null
  if (safe.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {safe.error.message}
      </p>
    )
  }
  const data = safe.data
  const over = data.allowed < 0
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Eyebrow>{m.spending_title()}</Eyebrow>
        <p className={`type-display font-medium break-words tabular-nums ${over ? 'text-destructive' : 'text-ink'}`}>
          {formatMoney(data.allowed, data.currency)}
        </p>
        <p className="label-mono text-muted-foreground">
          {data.expectedIncome > 0
            ? m.spending_days_until_income({ days: data.daysLeft })
            : m.spending_days_left({ days: data.daysLeft })}
        </p>
      </div>

      <dl className="grid gap-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-mono text-muted-foreground">{m.spending_money()}</dt>
          <dd className="text-soft tabular-nums">{formatMoney(data.available, data.currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-mono text-muted-foreground">{m.spending_bills()}</dt>
          <dd className="text-soft tabular-nums">{formatMoney(data.pendingBills, data.currency)}</dd>
        </div>
        {data.expectedIncome > 0 && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-mono text-muted-foreground">{m.spending_expected()}</dt>
            <dd className="text-soft tabular-nums">{formatMoney(data.expectedIncome, data.currency)}</dd>
          </div>
        )}
        {data.futureInstallments > 0 && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-mono text-muted-foreground">{m.spending_installments()}</dt>
            <dd className="text-soft tabular-nums">{formatMoney(data.futureInstallments, data.currency)}</dd>
          </div>
        )}
        {data.setAsides > 0 && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-mono text-muted-foreground">{m.spending_set_aside()}</dt>
            <dd className="text-soft tabular-nums">{formatMoney(data.setAsides, data.currency)}</dd>
          </div>
        )}
      </dl>

      {data.setAsides > 0 && <p className="label-mono text-muted-foreground">{m.spending_set_aside_hint()}</p>}

      {over && <p className="text-sm text-destructive">{m.spending_over()}</p>}
      {data.cappedByTarget && <p className="label-mono text-muted-foreground">{m.spending_capped()}</p>}

      <div>
        <TargetDialog target={data.target} currency={data.currency} />
      </div>
    </div>
  )
}
