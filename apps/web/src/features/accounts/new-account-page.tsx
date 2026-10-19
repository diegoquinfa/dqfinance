import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { countryLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { NativeSelect } from '#/shared/ui/native-select'
import { Spinner } from '#/shared/ui/spinner'
import { useSettings } from '../settings/settings-api'
import {
  useAccounts,
  useAdjustBalance,
  useCreateBank,
  useCreateBankAccount,
  useCreateProduct,
  type ProductInput,
} from './accounts-api'
import { productTypes } from './add-dialogs'
import { percentToBps } from './rates'
import { suggestedBanks } from './suggested-banks'

/** The sentinel of the two selects: it reveals the field that creates the row instead. */
const NEW = 'new'
const FORM_ID = 'new-account-form'

/**
 * #7: a whole account as a page. The opening balance is the first and largest field, and it is
 * recorded as a balance adjustment dated today (design D2), never as a stored balance.
 */
export function NewAccountPage({ bankId, bankAccountId }: { bankId?: string; bankAccountId?: string }) {
  const accounts = useAccounts()
  const settings = useSettings()
  const createBank = useCreateBank()
  const createBankAccount = useCreateBankAccount()
  const createProduct = useCreateProduct()
  const adjust = useAdjustBalance()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const banks = accounts.data?.banks ?? []
  // A preselected bank account (the accounts page links here) fixes its bank too.
  const selectedAccount = bankAccountId
    ? banks.flatMap((bank) => bank.accounts.map((account) => ({ bank, account }))).find((row) => row.account.id === bankAccountId)
    : undefined
  // null means untouched: the first choice that exists wins, so landing before the tree loads is safe.
  const [bank, setBank] = useState<string | null>(selectedAccount?.bank.id ?? bankId ?? null)
  const [account, setAccount] = useState<string | null>(selectedAccount?.account.id ?? null)
  const bankValue = bank ?? banks[0]?.id ?? NEW
  const bankAccounts = banks.find((item) => item.id === bankValue)?.accounts ?? []
  const accountValue = account ?? bankAccounts[0]?.id ?? NEW

  if (accounts.isPending || settings.isPending) return <ListSkeleton rows={5} />
  if (accounts.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {accounts.error.message}
      </p>
    )
  }
  // The signed-in shell only renders this page once the settings exist.
  if (!settings.data) return null

  const country = settings.data.country
  const suggestions = suggestedBanks(country)
  const pending =
    createBank.isPending || createBankAccount.isPending || createProduct.isPending || adjust.isPending
  const creatingBank = bankValue === NEW
  const creatingAccount = accountValue === NEW

  /** The chain the API needs: bank, its account, the product, then the opening balance as an adjustment. */
  async function submit(form: FormData) {
    setError(null)
    const created: string[] = []
    let chosenBank = bankValue
    let chosenAccount = accountValue
    try {
      if (creatingBank) {
        const row = await createBank.mutateAsync({ name: String(form.get('bankName')) })
        chosenBank = row.id
        setBank(chosenBank)
        created.push(m.toast_bank_created())
      }
      if (creatingAccount) {
        const last4 = String(form.get('last4')).trim()
        const row = await createBankAccount.mutateAsync({
          bankId: chosenBank,
          name: String(form.get('accountName')),
          last4: last4 || undefined,
        })
        chosenAccount = row.id
        setAccount(chosenAccount)
        created.push(m.toast_account_created())
      }
      const rate = String(form.get('annualRate')).trim()
      const product = await createProduct.mutateAsync({
        bankAccountId: chosenAccount,
        name: String(form.get('productName')),
        type: String(form.get('type')) as ProductInput['type'],
        currency: String(form.get('currency')) as never,
        annualRateBps: rate ? percentToBps(Number(rate)) : undefined,
      })
      created.push(m.toast_product_created())

      const opening = Number(form.get('openingBalance') ?? 0)
      if (opening !== 0) {
        await adjust.mutateAsync({ source: { type: 'product', id: product.id }, observedBalance: opening })
        created.push(m.toast_balance_adjusted())
      }

      toast.success(m.toast_product_created())
      void navigate({ to: '/accounts/$type/$id', params: { type: 'product', id: product.id } })
    } catch (failure) {
      // Say what was saved, and keep it selected so a retry does not create it twice.
      const message = failure instanceof Error ? failure.message : m.error_generic()
      setError(created.length ? m.accounts_new_partial({ created: created.join(' '), error: message }) : message)
    }
  }

  return (
    <>
      <header className="grid gap-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="grid gap-4 lg:col-span-8">
          <nav aria-label={m.nav_accounts()}>
            <Link to="/accounts" className="label-mono group inline-flex gap-2 text-muted-foreground hover:text-ink">
              <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1">
                ←
              </span>
              {m.nav_accounts()}
            </Link>
          </nav>
          <h1 className="type-title font-medium text-ink">{m.accounts_new_title()}</h1>
        </div>
        {/* Reachable at the top on mobile; the form repeats it at the end. */}
        <div className="lg:col-span-4 lg:justify-self-end">
          <Button type="submit" form={FORM_ID} className="w-full lg:w-auto" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </header>

      <form id={FORM_ID} className="grid max-w-2xl gap-6" action={(form) => submit(form)}>
        {/* The amount comes first and large: the opening balance is the number that matters. */}
        <div className="grid gap-2 border-b border-line pb-3 transition-colors has-focus-visible:border-signal">
          <Label htmlFor="new-opening-balance">{m.accounts_new_opening()}</Label>
          <div className="flex items-center gap-3">
            <input
              id="new-opening-balance"
              name="openingBalance"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              className="type-title w-full min-w-0 [appearance:textfield] bg-transparent font-medium text-ink tabular-nums placeholder:text-muted-foreground focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <NativeSelect
              name="currency"
              defaultValue={settings.data.primaryCurrency}
              aria-label={m.label_currency()}
              className="label-mono h-9 w-24 border border-line-strong bg-transparent text-center"
            >
              {settings.data.currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </NativeSelect>
          </div>
          <FieldDescription>{m.accounts_new_opening_hint()}</FieldDescription>
        </div>

        <FieldGroup>
          {banks.length > 0 && (
            <Field>
              <FieldLabel htmlFor="new-bank">{m.label_bank()}</FieldLabel>
              <NativeSelect
                id="new-bank"
                value={bankValue}
                onChange={(event) => {
                  setBank(event.target.value)
                  setAccount(null)
                }}
              >
                {banks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                <option value={NEW}>{m.accounts_new_bank_new()}</option>
              </NativeSelect>
              <FieldDescription>{m.accounts_new_bank_hint()}</FieldDescription>
            </Field>
          )}

          {creatingBank && (
            <Field>
              <FieldLabel htmlFor="new-bank-name">{m.accounts_new_bank_new()}</FieldLabel>
              <Input
                id="new-bank-name"
                name="bankName"
                list={suggestions.length ? 'new-bank-suggestions' : undefined}
                required
                maxLength={80}
              />
              {suggestions.length > 0 && (
                <datalist id="new-bank-suggestions">
                  {suggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
              <FieldDescription>
                {suggestions.length
                  ? m.accounts_suggested_banks({ country: countryLabel(country!) })
                  : m.accounts_bank_name_hint()}
              </FieldDescription>
            </Field>
          )}

          {bankAccounts.length > 0 && (
            <Field>
              <FieldLabel htmlFor="new-bank-account">{m.label_account()}</FieldLabel>
              <NativeSelect
                id="new-bank-account"
                value={accountValue}
                onChange={(event) => setAccount(event.target.value)}
              >
                {bankAccounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.last4 ? `${item.name} ···· ${item.last4}` : item.name}
                  </option>
                ))}
                <option value={NEW}>{m.accounts_new_account_new()}</option>
              </NativeSelect>
              <FieldDescription>{m.accounts_new_account_hint()}</FieldDescription>
            </Field>
          )}

          {creatingAccount && (
            <>
              <Field>
                <FieldLabel htmlFor="new-account-name">{m.accounts_new_account_new()}</FieldLabel>
                <Input id="new-account-name" name="accountName" required maxLength={80} />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-account-last4">{`${m.label_last4()} (${m.label_optional()})`}</FieldLabel>
                <Input id="new-account-last4" name="last4" inputMode="numeric" pattern="\d{4}" maxLength={4} />
              </Field>
            </>
          )}

          <Field>
            <FieldLabel htmlFor="new-product-name">{m.accounts_new_product_name()}</FieldLabel>
            <Input id="new-product-name" name="productName" required maxLength={80} />
          </Field>

          <Field>
            <FieldLabel htmlFor="new-product-type">{m.label_product_type()}</FieldLabel>
            <NativeSelect id="new-product-type" name="type" defaultValue="savings">
              {productTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label()}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="new-product-rate">{m.product_annual_rate()}</FieldLabel>
            <Input id="new-product-rate" name="annualRate" type="number" min="0" step="0.01" inputMode="decimal" />
            <FieldDescription>{m.product_annual_rate_hint()}</FieldDescription>
          </Field>
        </FieldGroup>

        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/accounts">{m.action_cancel()}</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </form>
    </>
  )
}
