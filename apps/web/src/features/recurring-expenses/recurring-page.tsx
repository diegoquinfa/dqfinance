import { useState } from 'react'
import { useSources, findSource, sourceKey, type SourceRef } from '#/features/accounts/sources'
import { SourceSelect } from '#/features/accounts/source-select'
import { useCategories } from '#/features/categories/categories-api'
import { useCounterparties } from '#/features/counterparties/counterparties-api'
import { useSettings } from '#/features/settings/settings-api'
import { sourceLabel } from '#/features/transactions/source-label'
import { formatDay, today } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney } from '#/shared/money'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/shared/ui/alert-dialog'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
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

function NewRecurringForm({
  close,
  defaultSourceKey = '',
  defaultCategoryId,
}: {
  close: () => void
  defaultSourceKey?: string
  defaultCategoryId?: string
}) {
  const { sources } = useSources()
  const settings = useSettings()
  // A prefilled cost needs its system category, which the picker hides by default.
  const categories = useCategories('expense', Boolean(defaultCategoryId))
  const counterparties = useCounterparties()
  const create = useCreateRecurringExpense()
  const [sourceKey, setSourceKey] = useState(defaultSourceKey)
  const [currency, setCurrency] = useState('')

  const source = findSource(sources, sourceKey)
  const isCreditCard = source?.cardKind === 'credit'
  const chargeCurrency = currency || source?.currency || ''
  const pickableCategories = (categories.data ?? []).filter(
    (category) => !category.system || category.id === defaultCategoryId,
  )
  const initialCategoryId = defaultCategoryId ?? pickableCategories[0]?.id

  function submit(event: React.FormEvent<HTMLFormElement>) {
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
      {
        onSuccess: () => {
          close()
          toast.success(m.toast_recurring_created())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="recurring-name">{m.label_name()}</FieldLabel>
          <Input id="recurring-name" name="name" required maxLength={80} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="recurring-amount">{m.label_amount()}</FieldLabel>
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
          <Field>
            <FieldLabel htmlFor="recurring-frequency">{m.label_frequency()}</FieldLabel>
            <Select name="frequency" defaultValue="monthly">
              <SelectTrigger id="recurring-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((frequency) => (
                  <SelectItem key={frequency.value} value={frequency.value}>
                    {frequency.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Field>
            <FieldLabel htmlFor="recurring-currency">{m.label_currency()}</FieldLabel>
            <Select value={chargeCurrency} onValueChange={setCurrency}>
              <SelectTrigger id="recurring-currency">
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
        <Field>
          <FieldLabel htmlFor="recurring-category">{m.label_category()}</FieldLabel>
          {/* The key re-picks the initial category once the list loads, like the native select did. */}
          <Select key={initialCategoryId} name="categoryId" defaultValue={initialCategoryId} required>
            <SelectTrigger id="recurring-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pickableCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="recurring-counterparty">{`${m.label_contact()} (${m.label_optional()})`}</FieldLabel>
          <Select name="counterpartyId" defaultValue="">
            <SelectTrigger id="recurring-counterparty">
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
          <FieldLabel htmlFor="recurring-starts-on">{m.label_date()}</FieldLabel>
          <Input id="recurring-starts-on" name="startsOn" type="date" defaultValue={today()} required />
        </Field>
        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending || !sourceKey}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </FieldGroup>
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
        <Field className="w-36">
          <FieldLabel htmlFor={`confirm-amount-${id}`}>{m.label_amount()}</FieldLabel>
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
            confirm.mutate(
              { id, amount: input ? Number(input.value) : amount },
              { onSuccess: () => toast.success(m.toast_recurring_confirmed()) },
            )
          }}
        >
          {confirm.isPending && <Spinner data-icon="inline-start" />}
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
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.recurring_empty()}</EmptyTitle>
              <EmptyDescription>{m.recurring_empty_description()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
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
                    {sourceLabel(item.source)} / {item.category.name} / {m.recurring_next_due({ date: formatDay(item.nextDueOn) })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink tabular-nums">{formatMoney(item.amount, item.currency)}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={remove.isPending}>
                        {m.action_delete()}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{m.recurring_delete_title()}</AlertDialogTitle>
                        <AlertDialogDescription>{m.recurring_delete_description()}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => remove.mutate(item.id)}>
                          {m.action_delete()}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

/**
 * The costs of one source, for its detail page: the recurring expenses paid with it, and the same
 * new-recurring form prefilled with the source and the system bank-fees category.
 */
export function SourceCosts({ sourceRef, index }: { sourceRef: SourceRef; index: string }) {
  const all = useRecurringExpenses(false)
  const categories = useCategories('expense', true)
  // shortcut: the categories API hides the system key, so bank fees are matched by their
  // localized name; upgrade when list_categories returns systemKey.
  const bankFees = (categories.data ?? []).find((category) => category.name === m.category_bank_fees())
  const costs = (all.data ?? []).filter(
    (item) => item.source.type === sourceRef.type && item.source.id === sourceRef.id,
  )

  return (
    <Section
      index={index}
      label={m.source_costs()}
      action={
        <DialogPanel trigger={<Button variant="link">{m.source_cost_add()}</Button>} title={m.source_cost_add()}>
          {(close) => (
            <NewRecurringForm close={close} defaultSourceKey={sourceKey(sourceRef)} defaultCategoryId={bankFees?.id} />
          )}
        </DialogPanel>
      }
    >
      {all.isPending ? (
        <ListSkeleton rows={2} />
      ) : all.error ? (
        <p role="alert" className="text-sm text-destructive">
          {all.error.message}
        </p>
      ) : costs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.source_costs_empty()}</EmptyTitle>
            <EmptyDescription>{m.source_costs_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className={rowsClass}>
          {costs.map((cost) => (
            <li key={cost.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="flex flex-wrap items-center gap-2 text-ink">
                {cost.name}
                <Badge variant="secondary">
                  {frequencies.find((frequency) => frequency.value === cost.frequency)?.label() ?? cost.frequency}
                </Badge>
                {!cost.active && <Badge variant="outline">{m.label_inactive()}</Badge>}
              </p>
              <span className="font-medium text-ink tabular-nums">{formatMoney(cost.amount, cost.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
