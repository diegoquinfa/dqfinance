import { useState, type FormEvent } from 'react'
import { authClient } from '#/features/auth/auth-client'
import { LocaleSwitch } from '#/features/auth/locale-switch'
import { useCategories, useCreateCategory } from '#/features/categories/categories-api'
import { currenciesByLabel, currencyLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FormError, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { Segmented } from '#/shared/ui/segmented'
import { useSettings, useUpdateSettings } from './settings-api'

function NewCategoryForm({ close }: { close: () => void }) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const create = useCreateCategory()
  return (
    <form
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        create.mutate({ name: String(form.get('name')), kind }, { onSuccess: close })
      }}
    >
      <Segmented
        name={m.label_kind()}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'expense', label: m.label_expense() },
          { value: 'income', label: m.label_income() },
        ]}
      />
      <Field id="category-name" label={m.label_name()}>
        <Input id="category-name" name="name" required maxLength={60} autoFocus />
      </Field>
      <FormError message={create.error?.message} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {m.action_create()}
        </Button>
      </div>
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
            <Field id="add-currency" label={m.onboarding_add_currency()} className="flex-1">
              <NativeSelect
                id="add-currency"
                value={currencyToAdd}
                onChange={(event) => setCurrencyToAdd(event.target.value)}
              >
                {currenciesByLabel().map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button
              variant="outline"
              disabled={currencies.includes(currencyToAdd)}
              onClick={() => setDraft([...currencies, currencyToAdd])}
            >
              {m.action_add()}
            </Button>
          </div>

          <FormError message={update.error?.message} />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={draft === null || update.isPending}
              onClick={() => update.mutate({ currencies }, { onSuccess: () => setDraft(null) })}
            >
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

      <Section index="04" label={m.settings_session()}>
        <Button variant="outline" onClick={() => void authClient.signOut()}>
          {m.action_sign_out()}
        </Button>
      </Section>
    </>
  )
}
