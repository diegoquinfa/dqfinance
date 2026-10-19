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

export const currencyName = (code: string, locale: Locale = currentLocale()) =>
  new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code

export function formatNumber(amount: number, locale: Locale = currentLocale()) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger' }).format(amount)
}
