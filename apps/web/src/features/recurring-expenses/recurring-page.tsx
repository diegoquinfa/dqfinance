import { useState, type FormEvent } from 'react'
import { useSources, findSource } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { useCategories } from '#/features/categories/categories-api'
import { useCounterparties } from '#/features/counterparties/counterparties-api'
import { useSettings } from '#/features/settings/settings-api'
import { formatDay, today } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { EmptyState, Field, FormError, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import {
  useConfirmRecurring,
  useCreateRecurringExpense,
  useDeleteRecurring,
  useRecurringExpenses,
  useSkipRecurring,
  type NewRecurringExpense,
} from './recurring-expenses-api'

const frequencies = [
  { value: 'weekly', label: m.frequency_weekly },
  { value: 'monthly', label: m.frequency_monthly },
  { value: 'yearly', label: m.frequency_yearly },
] as const satisfies readonly { value: NewRecurringExpense['frequency']; label: () => string }[]

function NewRecurringForm({ close }: { close: () => void }) {
  const { sources } = useSources()
  const settings = useSettings()
  const categories = useCategories('expense')
  const counterparties = useCounterparties()
  const create = useCreateRecurringExpense()
  const [sourceKey, setSourceKey] = useState('')
  const [currency, setCurrency] = useState('')

  const source = findSource(sources, sourceKey)
  const isCreditCard = source?.cardKind === 'credit'
  const chargeCurrency = currency || source?.currency || ''

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!source) return
    const form = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(form.get('name')),
        amount: Number(form.get('amount')),
        source: source.ref,
        currency: isCreditCard && chargeCurrency !== source.currency ? chargeCurrency : undefined,
        categoryId: String(form.get('categoryId')),
        counterpartyId: String(form.get('counterpartyId')) || undefined,
        frequency: String(form.get('frequency')) as NewRecurringExpense['frequency'],
        startsOn: String(form.get('startsOn')),
      },
      { onSuccess: close },
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field id="recurring-name" label={m.label_name()}>
        <Input id="recurring-name" name="name" required maxLength={80} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="recurring-amount" label={m.label_amount()}>
          <Input
            id="recurring-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            className="tabular-nums"
          />
        </Field>
        <Field id="recurring-frequency" label={m.label_frequency()}>
          <NativeSelect id="recurring-frequency" name="frequency" defaultValue="monthly">
            {frequencies.map((frequency) => (
              <option key={frequency.value} value={frequency.value}>
                {frequency.label()}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <SourceSelect
        id="recurring-source"
        label={m.label_source()}
        options={sources}
        value={sourceKey}
        onChange={(key) => {
          setSourceKey(key)
          setCurrency('')
        }}
      />
      {isCreditCard && (
        <Field id="recurring-currency" label={m.label_currency()}>
          <NativeSelect id="recurring-currency" value={chargeCurrency} onChange={(event) => setCurrency(event.target.value)}>
            {(settings.data?.currencies ?? [source!.currency]).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field id="recurring-category" label={m.label_category()}>
        <NativeSelect id="recurring-category" name="categoryId" required>
          {(categories.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="recurring-counterparty" label={`${m.label_contact()} (${m.label_optional()})`}>
        <NativeSelect id="recurring-counterparty" name="counterpartyId" defaultValue="">
          <option value="" />
          {(counterparties.data ?? []).map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="recurring-starts-on" label={m.label_date()}>
        <Input id="recurring-starts-on" name="startsOn" type="date" defaultValue={today()} required />
      </Field>
      <FormError message={create.error?.message} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" disabled={create.isPending || !sourceKey}>
          {m.action_create()}
        </Button>
      </div>
    </form>
  )
}

/** Due item: the amount is editable because bills change. */
function PendingItem({ id, name, amount, currency, nextDueOn }: { id: string; name: string; amount: number; currency: string; nextDueOn: string }) {
  const confirm = useConfirmRecurring()
  const skip = useSkipRecurring()
  return (
    <li className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid gap-1">
        <p className="text-ink sm:type-heading-sm">{name}</p>
        <p className="label-mono text-muted-foreground">
          {formatDay(nextDueOn)}
          <span aria-hidden className="mx-2 text-faint">
            /
          </span>
          <span className="tabular-nums">{formatMoney(amount, currency)}</span>
        </p>
      </div>
      <div className="flex items-end gap-2">
        <Field id={`confirm-amount-${id}`} label={m.label_amount()} className="w-36">
          <Input
            id={`confirm-amount-${id}`}
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            defaultValue={amount}
            className="tabular-nums"
          />
        </Field>
        <Button
          variant="outline"
          disabled={confirm.isPending}
          onClick={() => {
            const input = document.getElementById(`confirm-amount-${id}`) as HTMLInputElement | null
            confirm.mutate({ id, amount: input ? Number(input.value) : amount })
          }}
        >
          {m.action_confirm()}
        </Button>
        <Button variant="ghost" disabled={skip.isPending} onClick={() => skip.mutate(id)}>
          {m.action_skip()}
        </Button>
      </div>
    </li>
  )
}

export function RecurringPage() {
  const all = useRecurringExpenses(false)
  const pending = useRecurringExpenses(true)
  const remove = useDeleteRecurring()

  return (
    <>
      <PageHeader
        title={m.recurring_title()}
        actions={
          <DialogPanel trigger={<Button variant="outline">{m.recurring_new()}</Button>} title={m.recurring_new()}>
            {(close) => <NewRecurringForm close={close} />}
          </DialogPanel>
        }
      />

      <Section index="01" label={m.recurring_pending_title()}>
        {pending.isPending ? (
          <ListSkeleton rows={2} />
        ) : (pending.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.overview_pending_empty()}</p>
        ) : (
          <ul className={rowsClass}>
            {(pending.data ?? []).map((item) => (
              <PendingItem
                key={item.id}
                id={item.id}
                name={item.name}
                amount={item.amount}
                currency={item.currency}
                nextDueOn={item.nextDueOn}
              />
            ))}
          </ul>
        )}
        {confirmOrSkipError(pending.error, all.error)}
      </Section>

      <Section index="02" label={m.recurring_schedule()}>
        {all.isPending ? (
          <ListSkeleton rows={4} />
        ) : all.error ? (
          <p role="alert" className="text-sm text-destructive">
            {all.error.message}
          </p>
        ) : all.data.length === 0 ? (
          <EmptyState title={m.recurring_empty()} description={m.recurring_empty_description()} />
        ) : (
          <ul className={rowsClass}>
            {all.data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-ink">
                    {item.name}
                    <Badge variant="secondary">
                      {frequencies.find((frequency) => frequency.value === item.frequency)?.label() ?? item.frequency}
                    </Badge>
                    {!item.active && (
                      <Badge variant="outline">{m.label_inactive()}</Badge>
                    )}
                  </p>
                  <p className="label-mono text-muted-foreground">
                    {item.source.name} / {item.category.name} / {m.recurring_next_due({ date: formatDay(item.nextDueOn) })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink tabular-nums">{formatMoney(item.amount, item.currency)}</span>
                  <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                    {m.action_delete()}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function confirmOrSkipError(...errors: (Error | null)[]) {
  const error = errors.find(Boolean)
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {error.message}
    </p>
  )
}
