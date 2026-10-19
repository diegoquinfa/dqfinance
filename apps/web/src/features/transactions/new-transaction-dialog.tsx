import { useState } from 'react'
import { useSources, findSource } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { useCategories } from '#/features/categories/categories-api'
import { useCounterparties } from '#/features/counterparties/counterparties-api'
import { useSettings } from '#/features/settings/settings-api'
import { dayToIso, today } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { NativeSelect } from '#/shared/ui/native-select'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toast } from 'sonner'
import { useCreateTransaction, type NewTransaction } from './transactions-api'

/** Content is unmounted when the dialog closes, so this state resets on every open. */
function NewTransactionForm({ close }: { close: () => void }) {
  const [type, setType] = useState<NewTransaction['type']>('expense')
  const [sourceKey, setSourceKey] = useState('')
  const [currency, setCurrency] = useState('')
  const { sources } = useSources()
  const settings = useSettings()
  const categories = useCategories(type)
  const counterparties = useCounterparties()
  const create = useCreateTransaction()

  const source = findSource(sources, sourceKey)
  const isCreditCard = source?.cardKind === 'credit'
  const chargeCurrency = currency || source?.currency || ''
  const isForeign = Boolean(isCreditCard && source && chargeCurrency !== source.currency)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!source) return
    const form = new FormData(event.currentTarget)
    create.mutate(
      {
        type,
        amount: Number(form.get('amount')),
        source: source.ref,
        currency: isForeign ? chargeCurrency : undefined,
        primaryAmount: isForeign ? Number(form.get('primaryAmount')) : undefined,
        categoryId: String(form.get('categoryId')),
        counterpartyId: String(form.get('counterpartyId')) || undefined,
        description: String(form.get('description')) || undefined,
        occurredAt: dayToIso(String(form.get('date'))),
      },
      {
        onSuccess: () => {
          close()
          toast.success(m.toast_transaction_created())
        },
      },
    )
  }

  if (sources.length === 0) {
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
      <FieldGroup className="gap-5">
        <ToggleGroup
          type="single"
          className="w-full"
          aria-label={m.label_kind()}
          value={type}
          onValueChange={(value) => setType(value as NewTransaction['type'])}
        >
          <ToggleGroupItem value="expense">{m.label_expense()}</ToggleGroupItem>
          <ToggleGroupItem value="income">{m.label_income()}</ToggleGroupItem>
        </ToggleGroup>

        {/* The amount comes first and large: recording must take seconds. Focus shows on the line below. */}
        <div className="grid gap-2 border-b border-line pb-3 transition-colors has-focus-visible:border-signal">
          <Label htmlFor="transaction-amount">{m.label_amount()}</Label>
          <div className="flex items-baseline gap-3">
            <input
              id="transaction-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              placeholder="0"
              required
              autoFocus
              className="type-title w-full min-w-0 [appearance:textfield] bg-transparent font-medium text-ink tabular-nums placeholder:text-muted-foreground focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {source && <span className="label-mono shrink-0 text-muted-foreground">{source.currency}</span>}
          </div>
        </div>

        <SourceSelect
          id="transaction-source"
          label={m.label_source()}
          hint={m.transactions_pick_source()}
          options={sources}
          value={sourceKey}
          onChange={(key) => {
            setSourceKey(key)
            setCurrency('')
          }}
        />

        <Field>
          <FieldLabel htmlFor="transaction-date">{m.label_date()}</FieldLabel>
          <Input id="transaction-date" name="date" type="date" defaultValue={today()} max={today()} required />
        </Field>

        {isCreditCard && (
          <Field>
            <FieldLabel htmlFor="transaction-currency">{m.label_currency()}</FieldLabel>
            <NativeSelect
              id="transaction-currency"
              value={chargeCurrency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {(settings.data?.currencies ?? [source!.currency]).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}

        {isForeign && (
          <Field>
            <FieldLabel htmlFor="transaction-primary">
              {m.label_primary_amount({ currency: source!.currency })}
            </FieldLabel>
            <Input
              id="transaction-primary"
              name="primaryAmount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              required
              className="tabular-nums"
            />
            <FieldDescription>{m.transactions_foreign_hint({ currency: source!.currency })}</FieldDescription>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="transaction-category">{m.label_category()}</FieldLabel>
          <NativeSelect id="transaction-category" name="categoryId" required>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="transaction-counterparty">{`${m.label_contact()} (${m.label_optional()})`}</FieldLabel>
          <NativeSelect id="transaction-counterparty" name="counterpartyId" defaultValue="">
            <option value="" />
            {(counterparties.data ?? []).map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="transaction-description">{`${m.label_description()} (${m.label_optional()})`}</FieldLabel>
          <Input id="transaction-description" name="description" maxLength={200} />
        </Field>

        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending || !sourceKey}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.transactions_submit()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function NewTransactionDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <DialogPanel trigger={trigger} title={m.transactions_new()}>
      {(close) => <NewTransactionForm close={close} />}
    </DialogPanel>
  )
}
