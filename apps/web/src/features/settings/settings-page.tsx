import { useState } from 'react'
import { authClient } from '#/features/auth/auth-client'
import { LocaleSwitch } from '#/features/auth/locale-switch'
import { useCategories, useCreateCategory } from '#/features/categories/categories-api'
import { currenciesByLabel, currencyLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { CodeCombobox } from '#/shared/ui/code-combobox'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toast } from 'sonner'
import { PasswordSection } from './password-section'
import { PushSection } from './push-section'
import { useSettings, useUpdateSettings } from './settings-api'

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
                      <li key={category.id} className="py-3 text-ink">
                        {category.name}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <PushSection />

      <PasswordSection />

      <Section index="06" label={m.settings_session()}>
        <Button variant="outline" onClick={() => void authClient.signOut()}>
          {m.action_sign_out()}
        </Button>
      </Section>
    </>
  )
}
