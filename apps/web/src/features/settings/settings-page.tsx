import { useState, type FormEvent } from 'react'
import { authClient } from '#/features/auth/auth-client'
import { LocaleSwitch } from '#/features/auth/locale-switch'
import { useCategories, useCreateCategory } from '#/features/categories/categories-api'
import { currenciesByLabel, currencyLabel } from '#/shared/currencies'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/shared/ui/card'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FormError, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { Segmented } from '#/shared/ui/segmented'
import { PushCard } from './push-card'
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
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{m.settings_title()}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{m.settings_language()}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <LocaleSwitch id="settings-language" persist={(locale) => update.mutateAsync({ locale })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{m.settings_currencies()}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {m.label_primary_currency()}
            </Badge>
            <span>{currencyLabel(primary)}</span>
          </div>

          <ul className="grid gap-2">
            {others.map((code) => (
              <li key={code} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
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
              disabled={draft === null || update.isPending}
              onClick={() => update.mutate({ currencies }, { onSuccess: () => setDraft(null) })}
            >
              {m.settings_save_currencies()}
            </Button>
            {update.isSuccess && draft === null && <span className="text-sm text-muted-foreground">{m.settings_saved()}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">{m.settings_categories()}</CardTitle>
          <DialogPanel
            trigger={<Button variant="outline" size="sm">{m.settings_new_category()}</Button>}
            title={m.settings_new_category()}
          >
            {(close) => <NewCategoryForm close={close} />}
          </DialogPanel>
        </CardHeader>
        <CardContent>
          {categories.isPending ? (
            <ListSkeleton rows={3} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(['expense', 'income'] as const).map((kind) => (
                <div key={kind}>
                  <p className="mb-2 text-sm font-medium">
                    {kind === 'expense' ? m.label_expense() : m.label_income()}
                  </p>
                  <ul className="grid gap-1 text-sm">
                    {(categories.data ?? [])
                      .filter((category) => category.kind === kind)
                      .map((category) => (
                        <li key={category.id}>{category.name}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PushCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{m.settings_session()}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button variant="outline" className="w-fit" onClick={() => void authClient.signOut()}>
            {m.action_sign_out()}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
