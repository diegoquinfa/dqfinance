import * as messages from '@dqfinance/i18n/messages'
import { baseLocale, getLocale, locales, setLocale } from '@dqfinance/i18n/runtime'

/** Paraglide catalog and locale helpers. Screens read text from `m`, never from literals. */
export const m = messages

export type Locale = (typeof locales)[number]

export const isLocale = (value: string): value is Locale => locales.includes(value as Locale)

/** The active locale. Server rendering has no cookie, so it falls back to the base locale. */
export function currentLocale(): Locale {
  try {
    return getLocale()
  } catch {
    return baseLocale
  }
}

/** Switching reloads the page, which re-resolves the locale from the cookie Paraglide just wrote. */
export const switchLocale = (locale: Locale) => setLocale(locale)

export const localeNames: Record<Locale, string> = { en: 'English', es: 'Español' }
