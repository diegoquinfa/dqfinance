import { useState } from 'react'
import { countryLabel, currenciesByLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { Spinner } from '#/shared/ui/spinner'
import { Badge } from '#/shared/ui/badge'
import { toast } from 'sonner'
import { useSettings } from '../settings/settings-api'
import { suggestedBanks } from './suggested-banks'
import {
  useCreateBank,
  useCreateBankAccount,
  useCreateCard,
  useCreateCashWallet,
  useCreateProduct,
  type CardInput,
  type ProductInput,
} from './accounts-api'

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
      <NativeSelect id={id} name="currency" defaultValue={defaultValue}>
        {currenciesByLabel().map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

function SubmitRow({ close, pending, error }: { close: () => void; pending: boolean; error?: string }) {
  return (
    <>
      <FieldError>{error}</FieldError>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {m.action_create()}
        </Button>
      </div>
    </>
  )
}

export function AddBankDialog() {
  const create = useCreateBank()
  const settings = useSettings()
  const country = settings.data?.country
  const banks = suggestedBanks(country)
  return (
    <DialogPanel trigger={<Button variant="outline">{m.accounts_add_bank()}</Button>} title={m.accounts_add_bank()}>
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            create.mutate(
              { name: String(form.get('name')) },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_bank_created())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="bank-name">{m.label_name()}</FieldLabel>
              <Input
                id="bank-name"
                name="name"
                list={banks.length ? 'bank-suggestions' : undefined}
                required
                maxLength={80}
                autoFocus
              />
              {banks.length > 0 && (
                <datalist id="bank-suggestions">
                  {banks.map((bank) => (
                    <option key={bank} value={bank} />
                  ))}
                </datalist>
              )}
              <FieldDescription>
                {banks.length
                  ? m.accounts_suggested_banks({ country: countryLabel(country!) })
                  : m.accounts_bank_name_hint()}
              </FieldDescription>
            </Field>
            <SubmitRow close={close} pending={create.isPending} error={create.error?.message} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

export function AddCashWalletDialog() {
  const create = useCreateCashWallet()
  return (
    <DialogPanel trigger={<Button variant="outline">{m.accounts_add_cash()}</Button>} title={m.accounts_add_cash()}>
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

export function AddBankAccountDialog({ bankId, bankName }: { bankId: string; bankName: string }) {
  const create = useCreateBankAccount()
  return (
    <DialogPanel
      trigger={<Button variant="link">{m.accounts_add_bank_account()}</Button>}
      title={`${m.accounts_add_bank_account()} · ${bankName}`}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const last4 = String(form.get('last4'))
            create.mutate(
              { bankId, name: String(form.get('name')), last4: last4 || undefined },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_account_created())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-name">{m.label_name()}</FieldLabel>
              <Input id="account-name" name="name" required maxLength={80} autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-last4">{`${m.label_last4()} (${m.label_optional()})`}</FieldLabel>
              <Input id="account-last4" name="last4" inputMode="numeric" pattern="\d{4}" maxLength={4} />
            </Field>
            <SubmitRow close={close} pending={create.isPending} error={create.error?.message} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

export function AddProductDialog({ bankAccountId, accountName }: { bankAccountId: string; accountName: string }) {
  const create = useCreateProduct()
  return (
    <DialogPanel
      trigger={<Button variant="link">{m.accounts_add_product()}</Button>}
      title={`${m.accounts_add_product()} · ${accountName}`}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            create.mutate(
              {
                bankAccountId,
                name: String(form.get('name')),
                type: String(form.get('type')) as ProductInput['type'],
                currency: String(form.get('currency')) as never,
              },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_product_created())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="product-name">{m.label_name()}</FieldLabel>
              <Input id="product-name" name="name" required maxLength={80} autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="product-type">{m.label_product_type()}</FieldLabel>
              <NativeSelect id="product-type" name="type" defaultValue="savings">
                {productTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label()}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <CurrencySelect id="product-currency" label={m.label_currency()} defaultValue="COP" />
            <SubmitRow close={close} pending={create.isPending} error={create.error?.message} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

export function AddCardDialog({ productId, productName }: { productId: string; productName: string }) {
  const create = useCreateCard()
  const [kind, setKind] = useState<CardInput['kind']>('debit')
  const isCredit = kind === 'credit'
  return (
    <DialogPanel
      trigger={<Button variant="link">{m.accounts_add_card()}</Button>}
      title={`${m.accounts_add_card()} · ${productName}`}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const last4 = String(form.get('last4'))
            const limit = String(form.get('limit'))
            const statementDay = String(form.get('statementDay'))
            const dueDay = String(form.get('dueDay'))
            create.mutate(
              {
                productId,
                kind,
                name: String(form.get('name')),
                last4: last4 || undefined,
                creditLimit: isCredit && limit ? Number(limit) : undefined,
                statementDay: isCredit && statementDay ? Number(statementDay) : undefined,
                dueDay: isCredit && dueDay ? Number(dueDay) : undefined,
              },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_card_created())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="card-kind">{m.label_kind()}</FieldLabel>
              <NativeSelect
                id="card-kind"
                name="kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as CardInput['kind'])}
              >
                {cardKinds.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label()}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="card-name">{m.label_name()}</FieldLabel>
              <Input id="card-name" name="name" required maxLength={80} autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="card-last4">{`${m.label_last4()} (${m.label_optional()})`}</FieldLabel>
              <Input id="card-last4" name="last4" inputMode="numeric" pattern="\d{4}" maxLength={4} />
            </Field>
            {isCredit && (
              <>
                <Field>
                  <FieldLabel htmlFor="card-limit">{m.label_limit()}</FieldLabel>
                  <Input id="card-limit" name="limit" type="number" min="0.01" step="0.01" inputMode="decimal" />
                  <FieldDescription>{m.accounts_credit_only_hint()}</FieldDescription>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="card-statement-day">{m.label_statement_day()}</FieldLabel>
                    <Input id="card-statement-day" name="statementDay" type="number" min="1" max="31" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="card-due-day">{m.label_due_day()}</FieldLabel>
                    <Input id="card-due-day" name="dueDay" type="number" min="1" max="31" />
                  </Field>
                </div>
              </>
            )}
            <SubmitRow close={close} pending={create.isPending} error={create.error?.message} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

/** Small label used in the account tree. */
export function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {children}
    </Badge>
  )
}
