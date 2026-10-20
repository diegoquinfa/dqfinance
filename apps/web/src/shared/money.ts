import { currentLocale, type Locale } from './i18n'

/**
 * Money formatting. Amounts are decimal numbers; the API stores integer cents.
 * Always 2 decimals unless the amount is whole: the currency default would hide COP cents.
 */
export function formatMoney(amount: number, currency: string, locale: Locale = currentLocale()) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    trailingZeroDisplay: 'stripIfInteger',
  }).format(amount)
}

/** "+$ 3.200.000" for income, "−$ 45.000,50" for expenses (U+2212 aligns with "+"). */
export const formatSignedAmount = (type: 'income' | 'expense', amount: number, currency: string) =>
  `${type === 'income' ? '+' : '−'}${formatMoney(amount, currency)}`

// Intl formatters are expensive to build and a chart builds one per tick.
const compactFormats = new Map<string, Intl.NumberFormat>()

/** "150 mil", "1,2 M": the axis of a chart gives the scale, the tooltip gives the exact amount. */
export function formatCompact(amount: number, locale: Locale = currentLocale()) {
  let format = compactFormats.get(locale)
  if (!format) {
    format = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
    compactFormats.set(locale, format)
  }
  return format.format(amount)
}

export function formatNumber(amount: number, locale: Locale = currentLocale()) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger' }).format(amount)
}
