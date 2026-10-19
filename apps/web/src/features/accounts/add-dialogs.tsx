import { currenciesByLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { CodeCombobox } from '#/shared/ui/code-combobox'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import { useCreateCashWallet, type CardInput, type ProductInput } from './accounts-api'

/** Option labels are the API's own unions, so a rename breaks the build here. */
export const productTypes = [
  { value: 'savings', label: m.product_savings },
  { value: 'checking', label: m.product_checking },
  { value: 'payroll', label: m.product_payroll },
  { value: 'investment', label: m.product_investment },
  { value: 'other', label: m.product_other },
] as const satisfies readonly { value: ProductInput['type']; label: () => string }[]

export const cardKinds = [
  { value: 'debit', label: m.card_debit },
  { value: 'credit', label: m.card_credit },
] as const satisfies readonly { value: CardInput['kind']; label: () => string }[]

function CurrencySelect({ id, defaultValue, label }: { id: string; defaultValue: string; label: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <CodeCombobox id={id} name="currency" items={currenciesByLabel()} defaultValue={defaultValue} required />
    </Field>
  )
}

export function SubmitRow({
  close,
  pending,
  error,
  label = m.action_create(),
}: {
  close: () => void
  pending: boolean
  error?: string
  label?: string
}) {
  return (
    <>
      <FieldError>{error}</FieldError>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {label}
        </Button>
      </div>
    </>
  )
}

export function AddCashWalletDialog() {
  const create = useCreateCashWallet()
  return (
    <DialogPanel trigger={<Button variant="link">{m.accounts_add_cash()}</Button>} title={m.accounts_add_cash()}>
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            create.mutate(
              { name: String(form.get('name')), currency: String(form.get('currency')) as never },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_cash_wallet_created())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="wallet-name">{m.label_name()}</FieldLabel>
              <Input id="wallet-name" name="name" required maxLength={80} autoFocus />
              <FieldDescription>{m.accounts_cash_hint()}</FieldDescription>
            </Field>
            <CurrencySelect id="wallet-currency" label={m.label_currency()} defaultValue="COP" />
            <SubmitRow close={close} pending={create.isPending} error={create.error?.message} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

export function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {children}
    </Badge>
  )
}
