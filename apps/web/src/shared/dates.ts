import { currentLocale, type Locale } from './i18n'

const dateFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })

/** Today's calendar date as YYYY-MM-DD, for date inputs. */
export const today = () => new Date().toLocaleDateString('sv')

/** Local noon keeps the chosen calendar day in any UTC offset. */
export const dayToIso = (day: string) => new Date(`${day}T12:00`).toISOString()

export const formatDate = (iso: string, locale: Locale = currentLocale()) => dateFormat(locale).format(new Date(iso))

export const formatDay = (day: string, locale: Locale = currentLocale()) =>
  dateFormat(locale).format(new Date(`${day}T12:00`))

/** The date part of an ISO datetime, in the browser's timezone. */
export const isoToDay = (iso: string) => new Date(iso).toLocaleDateString('sv')
