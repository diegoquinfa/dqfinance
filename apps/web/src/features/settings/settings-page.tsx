import { CATEGORY_ICONS, type CategoryIcon, type PaletteColor } from '@dqfinance/api/appearance'
import { useState } from 'react'
import { GitMerge, Pencil, Trash2 } from 'lucide-react'
import { authClient } from '#/features/auth/auth-client'
import { LocaleSwitch } from '#/features/auth/locale-switch'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useMergeCategories,
  useUpdateCategory,
  type Category,
} from '#/features/categories/categories-api'
import {
  CATEGORY_ICON_COMPONENTS,
  CATEGORY_MARK_COLORS,
  CategoryMark,
  categoryColor,
  categoryColors,
  categoryIcon,
  colorLabel,
} from '#/features/categories/category-mark'
import { currenciesByLabel, currencyLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
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
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { CodeCombobox } from '#/shared/ui/code-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toast } from 'sonner'
import { PasswordSection } from './password-section'
import { PushSection } from './push-section'
import { useSettings, useUpdateSettings } from './settings-api'
import { WebhooksBlock } from './webhooks-block'

function NewCategoryForm({ close }: { close: () => void }) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const create = useCreateCategory()
  return (
    <form
      action={(form) => {
        create.mutate(
          { name: String(form.get('name')), kind },
          {
            onSuccess: () => {
              close()
              toast.success(m.toast_category_created())
            },
          },
        )
      }}
    >
      <FieldGroup>
        <ToggleGroup
          type="single"
          className="w-full"
          aria-label={m.label_kind()}
          value={kind}
          onValueChange={(value) => setKind(value as 'expense' | 'income')}
        >
          <ToggleGroupItem value="expense">{m.label_expense()}</ToggleGroupItem>
          <ToggleGroupItem value="income">{m.label_income()}</ToggleGroupItem>
        </ToggleGroup>
        <Field>
          <FieldLabel htmlFor="category-name">{m.label_name()}</FieldLabel>
          <Input id="category-name" name="name" required maxLength={60} autoFocus />
        </Field>
        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** One icon of the picker. The slug is its name: an icon name is a proper noun. */
function IconChoice({
  slug,
  selected,
  onSelect,
}: {
  slug: CategoryIcon
  selected: boolean
  onSelect: () => void
}) {
  const Icon = CATEGORY_ICON_COMPONENTS[slug]
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-pressed={selected}
      onClick={onSelect}
      className={selected ? 'border-ink text-ink' : 'text-muted-foreground'}
    >
      <Icon aria-hidden />
      <span className="sr-only">{slug}</span>
    </Button>
  )
}

/** One color of the picker: a dot of the mark palette and its name. */
function ColorChoice({
  name,
  selected,
  onSelect,
}: {
  name: PaletteColor
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      onClick={onSelect}
      className={selected ? 'border-ink text-ink' : 'text-muted-foreground'}
    >
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_MARK_COLORS[name] }} />
      {colorLabel(name)}
    </Button>
  )
}

/** Renames a category and sets its mark. */
function EditCategoryDialog({ category }: { category: Category }) {
  const [open, setOpen] = useState(false)
  const [icon, setIcon] = useState<CategoryIcon | null>(categoryIcon(category.icon))
  const [color, setColor] = useState<PaletteColor | null>(categoryColor(category.color))
  const update = useUpdateCategory()

  return (
    <DialogPanel
      open={open}
      onOpenChange={(next) => {
        // Every open starts from the mark the category has now.
        if (next) {
          setIcon(categoryIcon(category.icon))
          setColor(categoryColor(category.color))
        }
        setOpen(next)
      }}
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Pencil aria-hidden />
          <span className="sr-only">{`${m.action_edit()}: ${category.name}`}</span>
        </Button>
      }
      title={m.category_edit()}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            update.mutate(
              { id: category.id, json: { name: String(form.get('name')), icon, color } },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_category_updated())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`category-edit-name-${category.id}`}>{m.label_name()}</FieldLabel>
              <Input
                id={`category-edit-name-${category.id}`}
                name="name"
                defaultValue={category.name}
                required
                maxLength={60}
                autoFocus
              />
            </Field>
            <Field>
              <span className="label-mono text-muted-foreground">{m.category_icon()}</span>
              <div role="group" aria-label={m.category_icon()} className="grid grid-cols-6 gap-2">
                {CATEGORY_ICONS.map((slug) => (
                  <IconChoice key={slug} slug={slug} selected={icon === slug} onSelect={() => setIcon(slug)} />
                ))}
              </div>
              <Button type="button" variant="ghost" size="xs" className="w-fit" onClick={() => setIcon(null)}>
                {m.category_no_icon()}
              </Button>
            </Field>
            <Field>
              <span className="label-mono text-muted-foreground">{m.category_color()}</span>
              <div role="group" aria-label={m.category_color()} className="flex flex-wrap gap-2">
                {categoryColors.map((name) => (
                  <ColorChoice key={name} name={name} selected={color === name} onSelect={() => setColor(name)} />
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => setColor(null)}>
                  {m.label_none()}
                </Button>
              </div>
            </Field>
            <FieldError>{update.error?.message}</FieldError>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {m.action_cancel()}
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Spinner data-icon="inline-start" />}
                {m.action_save()}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

/** Deleting is refused while the category still holds movements. */
function DeleteCategoryDialog({ category }: { category: Category }) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteCategory()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Trash2 aria-hidden />
          <span className="sr-only">{`${m.action_delete()}: ${category.name}`}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`${m.action_delete()}: ${category.name}`}</AlertDialogTitle>
          <AlertDialogDescription>{m.category_delete_hint()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Keep the dialog open while the request runs, and let its error show inside it.
              event.preventDefault()
              remove.mutate(
                { id: category.id },
                {
                  onSuccess: () => {
                    setOpen(false)
                    toast.success(m.toast_category_deleted())
                  },
                },
              )
            }}
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            {m.action_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
        <FieldError>{remove.error?.message}</FieldError>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Merges a category into another one of the same kind: its movements move over. */
function MergeCategoryDialog({ category, categories }: { category: Category; categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')
  const merge = useMergeCategories()
  // Only a category of the same kind can take the movements over.
  const targets = categories.filter((other) => other.kind === category.kind && other.id !== category.id)

  return (
    <DialogPanel
      open={open}
      onOpenChange={(next) => {
        if (next) setTarget('')
        setOpen(next)
      }}
      trigger={
        <Button variant="ghost" size="icon-sm" disabled={targets.length === 0}>
          <GitMerge aria-hidden />
          <span className="sr-only">{`${m.category_merge()}: ${category.name}`}</span>
        </Button>
      }
      title={m.category_merge()}
      description={m.category_merge_hint()}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!target) return
            merge.mutate(
              { sourceId: category.id, targetId: target },
              {
                onSuccess: (merged) => {
                  close()
                  toast.success(m.toast_category_merged(), {
                    description: m.category_moved_count({ count: merged.moved }),
                  })
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`category-merge-target-${category.id}`}>{m.category_merge_into()}</FieldLabel>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id={`category-merge-target-${category.id}`}>
                  <SelectValue placeholder={m.label_none()} />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((other) => (
                    <SelectItem key={other.id} value={other.id}>
                      <span className="flex items-center gap-2">
                        <CategoryMark icon={other.icon} color={other.color} />
                        {other.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <FieldError>{merge.error?.message}</FieldError>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {m.action_cancel()}
              </Button>
              <Button type="submit" disabled={merge.isPending || !target}>
                {merge.isPending && <Spinner data-icon="inline-start" />}
                {m.category_merge()}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

/** A category in the list: its mark, its name and the three actions. */
function CategoryRow({ category, categories }: { category: Category; categories: Category[] }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="flex min-w-0 items-center gap-2">
        <CategoryMark icon={category.icon} color={category.color} />
        <span className="truncate text-ink">{category.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <EditCategoryDialog category={category} />
        <MergeCategoryDialog category={category} categories={categories} />
        <DeleteCategoryDialog category={category} />
      </span>
    </li>
  )
}

export function SettingsPage() {
  const settings = useSettings()
  const update = useUpdateSettings()
  const categories = useCategories()
  const [currencyToAdd, setCurrencyToAdd] = useState('USD')
  const [draft, setDraft] = useState<string[] | null>(null)

  if (settings.isPending) return <ListSkeleton rows={3} />
  if (!settings.data) return null

  const primary = settings.data.primaryCurrency
  const currencies = draft ?? settings.data.currencies
  const others = currencies.filter((code) => code !== primary)

  return (
    <>
      <PageHeader title={m.settings_title()} />

      <Section index="01" label={m.settings_language()}>
        <div className="max-w-md">
          <LocaleSwitch id="settings-language" persist={(locale) => update.mutateAsync({ locale })} />
        </div>
      </Section>

      <Section index="02" label={m.settings_currencies()}>
        <div className="grid max-w-2xl gap-6">
          <ul className={rowsClass}>
            <li className="flex items-center justify-between gap-3 py-3">
              <span className="text-ink">{currencyLabel(primary)}</span>
              <Badge variant="secondary">{m.label_primary_currency()}</Badge>
            </li>
            {others.map((code) => (
              <li key={code} className="flex items-center justify-between gap-3 py-3 text-ink">
                {currencyLabel(code)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft(currencies.filter((value) => value !== code))}
                >
                  {m.action_delete()}
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor="add-currency">{m.onboarding_add_currency()}</FieldLabel>
              <CodeCombobox
                id="add-currency"
                items={currenciesByLabel()}
                value={currencyToAdd}
                onValueChange={setCurrencyToAdd}
              />
            </Field>
            <Button
              variant="outline"
              disabled={currencies.includes(currencyToAdd)}
              onClick={() => setDraft([...currencies, currencyToAdd])}
            >
              {m.action_add()}
            </Button>
          </div>

          <FieldError>{update.error?.message}</FieldError>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={draft === null || update.isPending}
              onClick={() => update.mutate({ currencies }, { onSuccess: () => setDraft(null) })}
            >
              {update.isPending && <Spinner data-icon="inline-start" />}
              {m.settings_save_currencies()}
            </Button>
            {update.isSuccess && draft === null && <span className="label-mono text-muted-foreground">{m.settings_saved()}</span>}
          </div>
        </div>
      </Section>

      <Section
        index="03"
        label={m.settings_categories()}
        action={
          <DialogPanel
            trigger={<Button variant="link">{m.settings_new_category()}</Button>}
            title={m.settings_new_category()}
          >
            {(close) => <NewCategoryForm close={close} />}
          </DialogPanel>
        }
      >
        {categories.isPending ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-12">
            {(['expense', 'income'] as const).map((kind) => (
              <div key={kind} className="grid content-start gap-3">
                <p className="label-mono text-muted-foreground">
                  {kind === 'expense' ? m.label_expense() : m.label_income()}
                </p>
                <ul className={rowsClass}>
                  {(categories.data ?? [])
                    .filter((category) => category.kind === kind)
                    .map((category) => (
                      <CategoryRow
                        key={category.id}
                        category={category}
                        categories={categories.data ?? []}
                      />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <PushSection />

      <PasswordSection />

      <WebhooksBlock />

      <Section index="07" label={m.settings_session()}>
        <Button variant="outline" onClick={() => void authClient.signOut()}>
          {m.action_sign_out()}
        </Button>
      </Section>
    </>
  )
}
