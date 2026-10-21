import { useState } from 'react'
import { useSources, findSource, sourceKey as keyOf } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { useCategories } from '#/features/categories/categories-api'
import { useCounterparties } from '#/features/counterparties/counterparties-api'
import { useSettings } from '#/features/settings/settings-api'
import { dayToIso, isoToDay, today } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { Textarea } from '#/shared/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toast } from 'sonner'
import { useCreateTransaction, useUpdateTransaction, type NewTransaction, type Transaction } from './transactions-api'

/**
 * Records a movement, or edits one when `transaction` is given (its values prefill the fields).
 * Content is unmounted when the dialog closes, so this state resets on every open.
 */
export function TransactionForm({
  close,
  defaultCounterpartyId,
  transaction,
}: {
  close: () => void
  defaultCounterpartyId?: string
  transaction?: Transaction
}) {
  const [type, setType] = useState<NewTransaction['type']>(transaction?.type ?? 'expense')
  const [sourceKey, setSourceKey] = useState(transaction ? keyOf(transaction.source) : '')
  const [currency, setCurrency] = useState(transaction?.currency ?? '')
  const { sources } = useSources()
  const settings = useSettings()
  const categories = useCategories(type)
  const counterparties = useCounterparties()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const save = transaction ? update : create

  const source = findSource(sources, sourceKey)
  const isCreditCard = source?.cardKind === 'credit'
  const chargeCurrency = currency || source?.currency || ''
  const isForeign = Boolean(isCreditCard && source && chargeCurrency !== source.currency)
  // An edit keeps its category while the type stays; otherwise the first one is chosen.
  const defaultCategoryId =
    transaction && transaction.type === type ? transaction.category.id : categories.data?.[0]?.id
  const originalDay = transaction && isoToDay(transaction.occurredAt)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!source) return
    const form = new FormData(event.currentTarget)
    const day = String(form.get('date'))
    const values = {
      type,
      amount: Number(form.get('amount')),
      source: source.ref,
      primaryAmount: isForeign ? Number(form.get('primaryAmount')) : undefined,
      categoryId: String(form.get('categoryId')),
    }
    const counterpartyId = String(form.get('counterpartyId'))
    const title = String(form.get('title'))
    const description = String(form.get('description'))
    if (transaction) {
      update.mutate(
        {
          id: transaction.id,
          json: {
            ...values,
            // An edit always names the currency: leaving it out would keep a foreign one.
            currency: chargeCurrency,
            counterpartyId: counterpartyId || null,
            title: title || null,
            description: description || null,
            // An unchanged day keeps the original time, and with it the order within the day.
            occurredAt: day === originalDay ? undefined : dayToIso(day),
          },
        },
        {
          onSuccess: () => {
            close()
            toast.success(m.toast_transaction_updated())
          },
        },
      )
      return
    }
    create.mutate(
      {
        ...values,
        currency: isForeign ? chargeCurrency : undefined,
        counterpartyId: counterpartyId || undefined,
        title: title || undefined,
        description: description || undefined,
        occurredAt: dayToIso(day),
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
              defaultValue={transaction?.amount}
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
          <Input id="transaction-date" name="date" type="date" defaultValue={originalDay ?? today()} max={today()} required />
        </Field>

        {isCreditCard && (
          <Field>
            <FieldLabel htmlFor="transaction-currency">{m.label_currency()}</FieldLabel>
            <Select value={chargeCurrency} onValueChange={setCurrency}>
              <SelectTrigger id="transaction-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(settings.data?.currencies ?? [source!.currency]).map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              defaultValue={transaction?.primaryAmount ?? undefined}
              required
              className="tabular-nums"
            />
            <FieldDescription>{m.transactions_foreign_hint({ currency: source!.currency })}</FieldDescription>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="transaction-category">{m.label_category()}</FieldLabel>
          {/* Like the native select it replaces, a category is always chosen; the key re-picks it when the list loads or the type changes. */}
          <Select key={defaultCategoryId} name="categoryId" defaultValue={defaultCategoryId} required>
            <SelectTrigger id="transaction-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="transaction-counterparty">{`${m.label_contact()} (${m.label_optional()})`}</FieldLabel>
          <Select name="counterpartyId" defaultValue={transaction?.counterparty?.id ?? defaultCounterpartyId ?? ''}>
            <SelectTrigger id="transaction-counterparty">
              <SelectValue placeholder={m.label_none()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{m.label_none()}</SelectItem>
              {(counterparties.data ?? []).map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="transaction-title">{`${m.label_title()} (${m.label_optional()})`}</FieldLabel>
          <Input
            id="transaction-title"
            name="title"
            defaultValue={transaction?.title ?? ''}
            maxLength={120}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="transaction-description">{`${m.label_description()} (${m.label_optional()})`}</FieldLabel>
          <Textarea
            id="transaction-description"
            name="description"
            className="font-sans"
            defaultValue={transaction?.description ?? ''}
            maxLength={2000}
          />
        </Field>

        <FieldError>{save.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={save.isPending || !sourceKey}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            {transaction ? m.action_save() : m.transactions_submit()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function NewTransactionDialog({
  trigger,
  defaultCounterpartyId,
}: {
  trigger: React.ReactNode
  /** Preselects the contact, so a movement with someone is one click away. */
  defaultCounterpartyId?: string
}) {
  return (
    <DialogPanel trigger={trigger} title={m.transactions_new()}>
      {(close) => <TransactionForm close={close} defaultCounterpartyId={defaultCounterpartyId} />}
    </DialogPanel>
  )
}
