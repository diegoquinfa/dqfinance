import { useCallback, useState } from 'react'
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
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { PageHeader, rowsClass } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import { GoalConfetti } from './goal-confetti'
import { reachesGoal } from './goal-reached'
import {
  useAddSavingsContribution,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useSavingsGoals,
  type SavingsGoal,
} from './savings-goals-api'

/** What the goal is for, how much it aims at, and by when. */
function NewGoalForm({ close }: { close: () => void }) {
  const create = useCreateSavingsGoal()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const targetDate = String(form.get('targetDate') ?? '')
    create.mutate(
      {
        name: String(form.get('name')),
        target: Number(form.get('target')),
        targetDate: targetDate || undefined,
      },
      {
        onSuccess: () => {
          close()
          toast.success(m.savings_created())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="savings-name">{m.savings_name()}</FieldLabel>
          <Input id="savings-name" name="name" required maxLength={60} autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="savings-target">{m.savings_target()}</FieldLabel>
          <Input
            id="savings-target"
            name="target"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            className="tabular-nums"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="savings-target-date">{m.savings_by_when()}</FieldLabel>
          <Input id="savings-target-date" name="targetDate" type="date" />
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

/** What the user puts into the goal today. */
function AddContributionForm({
  goal,
  close,
  onReached,
}: {
  goal: SavingsGoal
  close: () => void
  onReached: () => void
}) {
  const add = useAddSavingsContribution()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    const reached = reachesGoal(goal, amount)
    add.mutate(
      { goalId: goal.id, amount },
      {
        onSuccess: () => {
          close()
          if (reached) onReached()
          toast.success(reached ? m.savings_reached() : m.savings_contributed())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`savings-amount-${goal.id}`}>{m.label_amount()}</FieldLabel>
          <Input
            id={`savings-amount-${goal.id}`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            autoFocus
            className="tabular-nums"
          />
        </Field>
        <FieldError>{add.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending && <Spinner data-icon="inline-start" />}
            {m.action_save()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** One goal: what it holds, what is left, and what it asks for every month. */
function GoalRow({ goal, onReached }: { goal: SavingsGoal; onReached: () => void }) {
  const remove = useDeleteSavingsGoal()
  const percent = Math.round(goal.ratio * 100)
  const filled = Math.min(100, Math.max(0, percent))

  return (
    <li className="grid gap-3 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="type-heading-sm font-medium text-ink">{goal.name}</p>
          <p className="label-mono text-muted-foreground tabular-nums">{m.savings_progress({ percent })}</p>
        </div>
        {/* The progress: a hairline track with a hairline fill. */}
        <div aria-hidden className="h-px w-full bg-line">
          <div className="h-px bg-ink" style={{ width: `${filled}%` }} />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="label-mono text-muted-foreground">
            {m.savings_saved()}{' '}
            <span className="text-ink tabular-nums">{formatMoney(goal.contributed, goal.currency)}</span>
            <span aria-hidden className="mx-1 text-faint">
              /
            </span>
            <span className="tabular-nums">{formatMoney(goal.target, goal.currency)}</span>
          </p>
          <p className="label-mono text-muted-foreground">
            {m.savings_left()}{' '}
            <span className="text-ink tabular-nums">{formatMoney(goal.remaining, goal.currency)}</span>
          </p>
          {goal.monthly > 0 && (
            <p className="label-mono text-muted-foreground">
              {m.savings_each_month()}{' '}
              <span className="text-ink tabular-nums">{formatMoney(goal.monthly, goal.currency)}</span>
            </p>
          )}
          {goal.targetDate && (
            <p className="label-mono text-muted-foreground">
              {m.savings_by_when()}{' '}
              <span className="text-ink">{formatDay(goal.targetDate)}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DialogPanel
          trigger={<Button variant="outline" size="sm">{m.savings_add()}</Button>}
          title={m.savings_contribution()}
        >
          {(close) => <AddContributionForm goal={goal} close={close} onReached={onReached} />}
        </DialogPanel>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={remove.isPending}>
              {m.savings_delete()}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.savings_delete()}</AlertDialogTitle>
              <AlertDialogDescription>{m.savings_delete_hint()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => remove.mutate(goal.id, { onSuccess: () => toast.success(m.savings_deleted()) })}
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

export function SavingsGoalsPage() {
  const goals = useSavingsGoals()
  const [celebrating, setCelebrating] = useState(false)
  const finishCelebration = useCallback(() => setCelebrating(false), [])

  return (
    <>
      <PageHeader
        title={m.savings_title()}
        actions={
          <DialogPanel trigger={<Button variant="outline">{m.savings_new()}</Button>} title={m.savings_new()}>
            {(close) => <NewGoalForm close={close} />}
          </DialogPanel>
        }
      />

      {goals.isPending ? (
        <ListSkeleton rows={3} />
      ) : goals.error ? (
        <p role="alert" className="text-sm text-destructive">
          {goals.error.message}
        </p>
      ) : goals.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.savings_empty()}</EmptyTitle>
            <EmptyDescription>{m.savings_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className={rowsClass}>
          {goals.data.map((goal) => (
            <GoalRow key={goal.id} goal={goal} onReached={() => setCelebrating(true)} />
          ))}
        </ul>
      )}
      {celebrating && <GoalConfetti onDone={finishCelebration} />}
    </>
  )
}
