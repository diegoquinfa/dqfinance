import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/features/auth/auth-client'
import { browserCountry, countriesByLabel, currenciesByLabel, currencyLabel } from '#/shared/currencies'
import { currentLocale, localeNames, m, type Locale } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/shared/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { CodeCombobox } from '#/shared/ui/code-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { FocusLayout } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import { useCompleteOnboarding } from './onboarding-api'

/** Wizard: country, language and timezone, then the currencies the user works with. */
export function OnboardingWizard() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const complete = useCompleteOnboarding()
  const [step, setStep] = useState<1 | 2>(1)
  const [country, setCountry] = useState(() => (typeof navigator === 'undefined' ? '' : (browserCountry() ?? '')))
  const [locale, setLocale] = useState<Locale>(() => currentLocale())
  const [timezone] = useState(() =>
    typeof Intl === 'undefined' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [primaryCurrency, setPrimaryCurrency] = useState('COP')
  const [extra, setExtra] = useState<string[]>([])
  const [currencyToAdd, setCurrencyToAdd] = useState('USD')

  const currencies = useMemo(() => currenciesByLabel(), [])
  const countries = useMemo(() => countriesByLabel(), [])

  if (isPending) return <div className="min-h-dvh" aria-busy="true" />
  if (!session) return <Navigate to="/sign-in" />

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    complete.mutate(
      {
        country,
        locale,
        timezone,
        primaryCurrency,
        currencies: extra.filter((code) => code !== primaryCurrency),
      },
      // Onboarding created the settings; go straight to the accounts screen.
      {
        onSuccess: () => void navigate({ to: '/accounts' }),
      },
    )
  }

  return (
    <FocusLayout>
      <Card>
        <CardHeader>
          <CardTitle>{m.onboarding_title()}</CardTitle>
          <CardDescription>
            {step === 1 ? m.onboarding_step_country() : m.onboarding_step_money()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="country">{m.label_country()}</FieldLabel>
                <CodeCombobox id="country" items={countries} value={country} onValueChange={setCountry} />
                <FieldDescription>{m.onboarding_country_hint()}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="locale">{m.label_language()}</FieldLabel>
                <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
                  <SelectTrigger id="locale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(localeNames).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="timezone">{m.label_timezone()}</FieldLabel>
                <Input id="timezone" value={timezone} readOnly />
                <FieldDescription>{m.onboarding_timezone_hint()}</FieldDescription>
              </Field>
              <Button type="button" disabled={country.length !== 2} onClick={() => setStep(2)}>
                {m.action_next()}
              </Button>
            </FieldGroup>
          )}

          {step === 2 && (
            <form onSubmit={submit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="primary-currency">{m.label_primary_currency()}</FieldLabel>
                  <CodeCombobox
                    id="primary-currency"
                    items={currencies}
                    value={primaryCurrency}
                    onValueChange={(code) => {
                      setPrimaryCurrency(code)
                      setExtra((codes) => codes.filter((other) => other !== code))
                    }}
                  />
                  <FieldDescription>{m.onboarding_primary_currency_hint()}</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="extra-currency">{m.label_other_currencies()}</FieldLabel>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <CodeCombobox id="extra-currency" items={currencies} value={currencyToAdd} onValueChange={setCurrencyToAdd} />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currencyToAdd === primaryCurrency || extra.includes(currencyToAdd)}
                      onClick={() => setExtra((codes) => [...codes, currencyToAdd])}
                    >
                      {m.onboarding_add_currency()}
                    </Button>
                  </div>
                  <FieldDescription>{m.onboarding_other_currencies_hint()}</FieldDescription>
                </Field>

                {extra.length > 0 && (
                  <ul className="divide-y divide-line border-y border-line text-sm">
                    {extra.map((code) => (
                      <li key={code} className="flex items-center justify-between py-2 text-ink">
                        {currencyLabel(code)}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExtra((codes) => codes.filter((value) => value !== code))}
                        >
                          {m.action_delete()}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <FieldError>{complete.error?.message}</FieldError>
                <div className="flex justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    {m.action_back()}
                  </Button>
                  <Button type="submit" disabled={complete.isPending}>
                    {complete.isPending && <Spinner data-icon="inline-start" />}
                    {m.action_finish()}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}

        </CardContent>
      </Card>
    </FocusLayout>
  )
}
