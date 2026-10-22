import { useCategories } from '#/features/categories/categories-api'
import { CategoryMark } from '#/features/categories/category-mark'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import { useBudgets, useDeleteBudget, useSetBudget, type Budget } from './budgets-api'

/** The limit of a category: what it may spend in a month. */
function SetLimitForm({ close }: { close: () => void }) {
  const categories = useCategories()
  const save = useSetBudget()
  // A budget is about spending, so only expense categories can hold one.
  const expenseCategories = (categories.data ?? []).filter((category) => category.kind === 'expense')
  const defaultCategoryId = expenseCategories[0]?.id

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    save.mutate(
      { categoryId: String(form.get('categoryId')), amount: Number(form.get('amount')) },
      {
        onSuccess: () => {
          close()
          toast.success(m.budgets_created())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="budgets-category">{m.budgets_category()}</FieldLabel>
          {/* The key re-picks the category when the list arrives. */}
          <Select key={defaultCategoryId} name="categoryId" defaultValue={defaultCategoryId} required>
            <SelectTrigger id="budgets-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <CategoryMark icon={category.icon} color={category.color} />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="budgets-limit">{m.budgets_limit()}</FieldLabel>
          <Input
            id="budgets-limit"
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
        <FieldError>{save.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={save.isPending || !defaultCategoryId}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            {m.action_save()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** One budget: the category, its limit, what it spent and what is left of it. */
function BudgetRow({ budget, category }: { budget: Budget; category?: { name: string; icon: string | null; color: string | null } }) {
  const remove = useDeleteBudget()
  const filled = Math.min(100, Math.max(0, budget.ratio * 100))

  return (
    <li className="grid gap-3 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="type-heading-sm flex items-center gap-2 font-medium text-ink">
            <CategoryMark icon={category?.icon ?? null} color={category?.color ?? null} />
            {category?.name ?? budget.categoryId}
          </p>
          <p className="label-mono text-muted-foreground tabular-nums">
            {m.budgets_limit()} <span className="text-ink">{formatMoney(budget.limit, budget.currency)}</span>
          </p>
        </div>
        {/* The progress: a hairline track with a hairline fill. */}
        <div aria-hidden className="h-px w-full bg-line">
          <div className="h-px bg-ink" style={{ width: `${filled}%` }} />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="label-mono text-muted-foreground">
            {m.budgets_spent()} <span className="text-ink tabular-nums">{formatMoney(budget.spent, budget.currency)}</span>
          </p>
          <p className="label-mono text-muted-foreground">
            {m.budgets_left()} <span className="text-ink tabular-nums">{formatMoney(budget.left, budget.currency)}</span>
          </p>
          {budget.close && <p className="label-mono text-muted-foreground">{m.budgets_close()}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={remove.isPending}>
              {m.action_delete()}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.action_delete()}</AlertDialogTitle>
              <AlertDialogDescription>{m.budgets_delete_hint()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => remove.mutate(budget.id, { onSuccess: () => toast.success(m.budgets_deleted()) })}
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

export function BudgetsPage() {
  const budgets = useBudgets()
  const categories = useCategories()
  // The API names a category by id; the name and the mark come from the categories.
  const byId = new Map((categories.data ?? []).map((category) => [category.id, category]))

  return (
    <>
      <PageHeader
        title={m.budgets_title()}
        actions={
          <DialogPanel trigger={<Button variant="outline">{m.budgets_new()}</Button>} title={m.budgets_new()}>
            {(close) => <SetLimitForm close={close} />}
          </DialogPanel>
        }
      />

      {budgets.isPending ? (
        <ListSkeleton rows={3} />
      ) : budgets.error ? (
        <p role="alert" className="text-sm text-destructive">
          {budgets.error.message}
        </p>
      ) : budgets.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.budgets_empty()}</EmptyTitle>
            <EmptyDescription>{m.budgets_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className={rowsClass}>
          {budgets.data.map((budget) => (
            <BudgetRow key={budget.id} budget={budget} category={byId.get(budget.categoryId)} />
          ))}
        </ul>
      )}
    </>
  )
}
