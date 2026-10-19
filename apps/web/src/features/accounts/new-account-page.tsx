import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
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
import { BankNameInput } from './bank-name-input'
import { percentToBps } from './rates'
import { suggestedBanks } from './suggested-banks'

/** The sentinel of the existing-account select: it reveals the field that creates the row instead. */
const NEW = 'new'
const FORM_ID = 'new-account-form'

/** A bank name matches without case or accent: "bancolombia" is "Bancolombia". */
const sameName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0

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
  // null means untouched: the first choice that exists wins, so landing before the tree loads is safe.
  const [bankText, setBankText] = useState<string | null>(null)
  // The choice belongs to a bank: when the bank changes, the choice starts over.
  const [choice, setChoice] = useState<{ bank: string; value: string } | null>(null)
  const [type, setType] = useState<string>('savings')
  // What a previous attempt created, so a retry does not create it twice.
  const [createdBank, setCreatedBank] = useState<{ id: string; name: string } | null>(null)
  const [createdAccount, setCreatedAccount] = useState<{ id: string; bankId: string } | null>(null)

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

  const banks = accounts.data?.banks ?? []
  // A preselected bank account (the accounts page links here) fixes its bank too.
  const selectedAccount = bankAccountId
    ? banks.flatMap((bank) => bank.accounts.map((account) => ({ bank, account }))).find((row) => row.account.id === bankAccountId)
    : undefined
  const preselectedBank = selectedAccount?.bank ?? banks.find((bank) => bank.id === bankId)
  const text = (bankText ?? preselectedBank?.name ?? '').trim()
  const matchedBank = banks.find((bank) => sameName(bank.name, text))
  const bankAccounts = matchedBank?.accounts ?? []
  // NEW, unless the preselected bank account belongs to the bank the name matches.
  const preselectedAccount =
    selectedAccount && selectedAccount.bank.id === matchedBank?.id ? selectedAccount.account.id : NEW
  const accountChoice = choice && choice.bank === matchedBank?.id ? choice.value : preselectedAccount
  const creatingAccount = accountChoice === NEW
  const typeLabel = productTypes.find((item) => item.value === type)?.label() ?? type

  const country = settings.data.country
  const suggestions = [
    ...banks.map((bank) => bank.name),
    ...suggestedBanks(country).filter((name) => !banks.some((bank) => sameName(bank.name, name))),
  ]
  const pending =
    createBank.isPending || createBankAccount.isPending || createProduct.isPending || adjust.isPending

  /** The chain the API needs: bank, its account, the product, then the opening balance as an adjustment. */
  async function submit(form: FormData) {
    setError(null)
    const created: string[] = []
    try {
      const name = text.trim()
      const productName = String(form.get('productName') ?? '').trim() || typeLabel
      let chosenBank = matchedBank?.id
      if (!chosenBank) {
        // A retry after a partial failure reuses what the first attempt created.
        if (createdBank && sameName(createdBank.name, name)) {
          chosenBank = createdBank.id
        } else {
          const row = await createBank.mutateAsync({ name })
          setCreatedBank({ id: row.id, name })
          chosenBank = row.id
          created.push(m.toast_bank_created())
        }
      }
      let chosenAccount = creatingAccount ? undefined : accountChoice
      if (!chosenAccount) {
        if (createdAccount && createdAccount.bankId === chosenBank) {
          chosenAccount = createdAccount.id
        } else {
          const last4 = String(form.get('last4') ?? '').trim()
          const row = await createBankAccount.mutateAsync({
            bankId: chosenBank,
            name: productName,
            last4: last4 || undefined,
          })
          setCreatedAccount({ id: row.id, bankId: chosenBank })
          chosenAccount = row.id
          created.push(m.toast_account_created())
        }
      }
      const rate = String(form.get('annualRate')).trim()
      const product = await createProduct.mutateAsync({
        bankAccountId: chosenAccount,
        name: productName,
        type: type as ProductInput['type'],
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

      {/* onSubmit, not action: React clears an action form after it runs, losing a failed create's fields. */}
      <form
        id={FORM_ID}
        className="grid max-w-2xl gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(new FormData(event.currentTarget))
        }}
      >
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
            <Select name="currency" defaultValue={settings.data.primaryCurrency}>
              <SelectTrigger
                aria-label={m.label_currency()}
                className="label-mono h-9 w-24 border border-line-strong bg-transparent"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.data.currencies.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FieldDescription>{m.accounts_new_opening_hint()}</FieldDescription>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-bank">{m.label_bank()}</FieldLabel>
            <BankNameInput
              id="new-bank"
              name="bankName"
              suggestions={suggestions}
              value={bankText ?? preselectedBank?.name ?? ''}
              onValueChange={setBankText}
            />
            <FieldDescription>
              {!text
                ? m.accounts_new_bank_hint()
                : matchedBank
                  ? m.accounts_bank_reuse({ bank: matchedBank.name })
                  : m.accounts_bank_create({ bank: text })}
            </FieldDescription>
          </Field>

          {/* The bank account level is hidden: it only shows when the bank already has one to pick. */}
          {bankAccounts.length > 0 && (
            <Field>
              <FieldLabel htmlFor="new-existing-account">{m.accounts_new_existing_account()}</FieldLabel>
              <Select
                value={accountChoice}
                onValueChange={(value) => setChoice({ bank: matchedBank?.id ?? '', value })}
              >
                <SelectTrigger id="new-existing-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW}>{m.accounts_new_existing_none()}</SelectItem>
                  {bankAccounts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.last4 ? `${item.name} ···· ${item.last4}` : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{m.accounts_new_account_hint()}</FieldDescription>
            </Field>
          )}

          <Field>
            <span className="label-mono text-muted-foreground">{m.label_product_type()}</span>
            <ToggleGroup
              type="single"
              className="w-full flex-wrap"
              aria-label={m.label_product_type()}
              value={type}
              onValueChange={(value) => setType(value)}
            >
              {productTypes.map((item) => (
                <ToggleGroupItem key={item.value} value={item.value}>
                  {item.label()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="new-product-name">{m.accounts_new_product_name()}</FieldLabel>
            <Input id="new-product-name" name="productName" maxLength={80} placeholder={typeLabel} />
            <FieldDescription>{m.accounts_new_name_hint()}</FieldDescription>
          </Field>

          {creatingAccount && (
            <Field>
              <FieldLabel htmlFor="new-account-last4">{`${m.label_last4()} (${m.label_optional()})`}</FieldLabel>
              <Input id="new-account-last4" name="last4" inputMode="numeric" pattern="\d{4}" maxLength={4} />
            </Field>
          )}

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
