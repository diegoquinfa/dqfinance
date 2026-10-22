import { formatDay } from '#/shared/dates'
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
import { PageHeader, rowsClass } from '#/shared/ui/page'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import {
  useCreateExpectedIncome,
  useDeleteExpectedIncome,
  useExpectedIncomes,
  type ExpectedIncome,
  type NewExpectedIncome,
} from './expected-incomes-api'

const frequencies = [
  { value: 'weekly', label: m.frequency_weekly },
  { value: 'biweekly', label: m.frequency_biweekly },
  { value: 'monthly', label: m.frequency_monthly },
  { value: 'irregular', label: m.frequency_irregular },
] as const satisfies readonly { value: NewExpectedIncome['frequency']; label: () => string }[]

/** The label of a frequency the API stores as a plain word. */
function frequencyLabel(frequency: string) {
  return frequencies.find((option) => option.value === frequency)?.label() ?? frequency
}

/** What the money is coming from, how much, and when the next one lands. */
function NewIncomeForm({ close }: { close: () => void }) {
  const create = useCreateExpectedIncome()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextOn = String(form.get('nextOn') ?? '')
    create.mutate(
      {
        name: String(form.get('name')),
        amount: Number(form.get('amount')),
        frequency: String(form.get('frequency')) as NewExpectedIncome['frequency'],
        nextOn: nextOn || undefined,
      },
      {
        onSuccess: () => {
          close()
          toast.success(m.incomes_created())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="incomes-name">{m.incomes_name()}</FieldLabel>
          <Input id="incomes-name" name="name" required maxLength={60} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="incomes-amount">{m.incomes_amount()}</FieldLabel>
            <Input
              id="incomes-amount"
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
            <FieldLabel htmlFor="incomes-frequency">{m.incomes_frequency()}</FieldLabel>
            <Select name="frequency" defaultValue="monthly">
              <SelectTrigger id="incomes-frequency">
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
        <Field>
          <FieldLabel htmlFor="incomes-next-on">{m.incomes_next_on()}</FieldLabel>
          <Input id="incomes-next-on" name="nextOn" type="date" />
        </Field>
        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.action_save()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** One expected income: what it is, how much, and the day the next one arrives. */
function IncomeRow({ income }: { income: ExpectedIncome }) {
  const remove = useDeleteExpectedIncome()

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="grid gap-1">
        <p className="flex flex-wrap items-center gap-2 text-ink">
          {income.name}
          <Badge variant="secondary">{frequencyLabel(income.frequency)}</Badge>
        </p>
        <p className="label-mono text-muted-foreground">
          {m.incomes_arrives()}{' '}
          <span className="text-ink">{formatDay(income.nextOn)}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium text-ink tabular-nums">{formatMoney(income.amount, income.currency)}</span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={remove.isPending}>
              {m.action_delete()}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.action_delete()}</AlertDialogTitle>
              <AlertDialogDescription>{m.incomes_delete_hint()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => remove.mutate(income.id, { onSuccess: () => toast.success(m.incomes_deleted()) })}
              >
                {m.action_delete()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}

export function ExpectedIncomesPage() {
  const incomes = useExpectedIncomes()

  return (
    <>
      <PageHeader
        title={m.incomes_title()}
        actions={
          <DialogPanel trigger={<Button variant="outline">{m.incomes_new()}</Button>} title={m.incomes_new()}>
            {(close) => <NewIncomeForm close={close} />}
          </DialogPanel>
        }
      />

      {incomes.isPending ? (
        <ListSkeleton rows={3} />
      ) : incomes.error ? (
        <p role="alert" className="text-sm text-destructive">
          {incomes.error.message}
        </p>
      ) : incomes.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.incomes_empty()}</EmptyTitle>
            <EmptyDescription>{m.incomes_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className={rowsClass}>
          {incomes.data.map((income) => (
            <IncomeRow key={income.id} income={income} />
          ))}
        </ul>
      )}
    </>
  )
}
