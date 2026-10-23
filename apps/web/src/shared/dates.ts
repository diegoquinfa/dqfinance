import { currentLocale, type Locale } from './i18n'
import { dayIn, noonIn } from './zoned-day'

// The user's saved timezone, set by the signed-in shell. Until it is set (signed-out pages, before settings load)
// days fall back to the device's.
let userTimeZone: string | undefined
export const setUserTimeZone = (timeZone: string | undefined) => {
  userTimeZone = timeZone
}

const dateFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: userTimeZone })

/** The calendar day an instant falls on, in the user's timezone. */
const dayOf = (at: Date) => (userTimeZone ? dayIn(userTimeZone, at) : at.toLocaleDateString('sv'))

/** Today's calendar date as YYYY-MM-DD, for date inputs. */
export const today = () => dayOf(new Date())

/** Today at device-local noon: its local getters read the user's calendar day, for the period helpers. */
export const todayDate = () => new Date(`${today()}T12:00`)

/** Noon keeps the chosen calendar day in any UTC offset. */
export const dayToIso = (day: string) =>
  userTimeZone ? noonIn(userTimeZone, day) : new Date(`${day}T12:00`).toISOString()

export const formatDate = (iso: string, locale: Locale = currentLocale()) => dateFormat(locale).format(new Date(iso))

export const formatDay = (day: string, locale: Locale = currentLocale()) =>
  dateFormat(locale).format(new Date(dayToIso(day)))

/** The date part of an ISO datetime, in the user's timezone. */
export const isoToDay = (iso: string) => dayOf(new Date(iso))
