import { baseLocale, isLocale } from '@dqfinance/i18n/runtime'

export type Locale = 'en' | 'es'

/** Picks the first supported language from an Accept-Language header ("es-CO,es;q=0.9,en;q=0.8"). */
export function resolveLocale(acceptLanguage: string | undefined | null): Locale {
  const ranked = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = Number(params.find((p) => p.trim().startsWith('q='))?.split('=')[1] ?? 1)
      return { language: tag.split('-')[0]!.toLowerCase(), q: Number.isNaN(q) ? 0 : q }
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q)
  const match = ranked.find((entry) => isLocale(entry.language))
  return (match?.language ?? baseLocale) as Locale
}
