import * as m from '@dqfinance/i18n/messages'
import type { Locale } from '../../shared/locale'

/**
 * The demo ledger, as data.
 *
 * Fixed on purpose: every guest sees the same numbers, and the screenshots on the landing
 * page stay true. Nothing here touches the database, so the plan can be checked on its own.
 */

export const DEMO_CURRENCY = 'USD'
export const DEMO_COUNTRY = 'US'
export const DEMO_TIMEZONE = 'America/New_York'
/** How many months of history the ledger carries. */
export const DEMO_MONTHS = 6

export const CONTACTS = [
  { key: 'employer', kind: 'business' },
  { key: 'landlord', kind: 'business' },
  { key: 'market', kind: 'business' },
  { key: 'coffee', kind: 'business' },
  { key: 'transit', kind: 'business' },
  { key: 'utility', kind: 'business' },
  { key: 'streaming', kind: 'business' },
  { key: 'store', kind: 'business' },
  { key: 'cinema', kind: 'business' },
  { key: 'gym', kind: 'business' },
  { key: 'client', kind: 'person' },
] as const

export type ContactKey = (typeof CONTACTS)[number]['key']

/** The sources a movement can come from. */
export type DemoSource = 'checking' | 'savings' | 'card' | 'cash'

/** The movements of a month, repeated over the demo's months. */
const MONTHLY = [
  { day: 1, type: 'income', amount: 3200, category: 'salary', source: 'checking', contact: 'employer', description: 'salary' },
  { day: 3, type: 'expense', amount: 1450, category: 'housing', source: 'checking', contact: 'landlord', description: 'rent' },
  { day: 5, type: 'expense', amount: 6.5, category: 'food', source: 'cash', contact: 'coffee', description: 'coffee' },
  { day: 8, type: 'expense', amount: 118.4, category: 'food', source: 'card', contact: 'market', description: 'groceries' },
  { day: 9, type: 'expense', amount: 2.75, category: 'transport', source: 'cash', contact: 'transit', description: 'fare' },
  { day: 12, type: 'expense', amount: 59.99, category: 'utilities', source: 'checking', contact: 'utility', description: 'internet' },
  { day: 15, type: 'expense', amount: 24.9, category: 'subscriptions', source: 'card', contact: 'streaming', description: 'streaming' },
  { day: 17, type: 'expense', amount: 74.2, category: 'shopping', source: 'card', contact: 'store', description: 'shopping' },
  { day: 19, type: 'expense', amount: 86.9, category: 'food', source: 'card', contact: 'market', description: 'groceries' },
  { day: 21, type: 'expense', amount: 45, category: 'transport', source: 'checking', contact: 'transit', description: 'pass' },
  { day: 24, type: 'expense', amount: 32, category: 'entertainment', source: 'card', contact: 'cinema', description: 'cinema' },
  { day: 26, type: 'expense', amount: 35, category: 'health', source: 'cash', contact: 'gym', description: 'gym' },
  { day: 28, type: 'income', amount: 450, category: 'freelance', source: 'checking', contact: 'client', description: 'freelance' },
] as const

/** The default categories the movements use. */
export type CategoryKey = (typeof MONTHLY)[number]['category']

/** What the movement was for, beside the contact's name. */
export type DescriptionKey = (typeof MONTHLY)[number]['description']

/** Recurring expenses: what lands in the "to confirm" inbox and on the calendar. */
export const RECURRING = [
  { name: 'streaming', amount: 24.9, category: 'subscriptions', inDays: 3 },
  { name: 'utility', amount: 59.99, category: 'utilities', inDays: 9 },
  { name: 'gym', amount: 39, category: 'health', inDays: 16 },
] as const

export type DemoMovement = {
  date: string
  type: 'income' | 'expense'
  amount: number
  category: CategoryKey
  source: DemoSource
  contact: ContactKey
  description: DescriptionKey
}

export type DemoTransfer = { date: string; to: 'savings' | 'card'; amount: number }

/** The name of a contact, in the language of the ledger. */
export const contactName = (key: ContactKey, locale: Locale) => m[`demo_contact_${key}`]({}, { locale })

/** What a movement was for, in the language of the ledger. */
export const movementDescription = (key: DescriptionKey, locale: Locale) => m[`demo_desc_${key}`]({}, { locale })

/** The date of a day of the month, `monthsBack` months before the demo's current month. */
export const dayIn = (today: string, monthsBack: number, day: number) => {
  const date = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - monthsBack, day, 12))
  return date.toISOString().slice(0, 10)
}

/** The date `days` after the demo's today. */
export const dayFrom = (today: string, days: number) => {
  const date = new Date(`${today}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * The movements of one month: the template, minus the days that have not happened yet.
 * The current month stops at today, so the ledger never carries a future movement.
 */
export function demoMovements(today: string, monthsBack: number): DemoMovement[] {
  return MONTHLY.flatMap((movement) => {
    const date = dayIn(today, monthsBack, movement.day)
    if (monthsBack === 0 && date > today) return []
    return [{ ...movement, date }]
  })
}

/** The transfers of one month: money set aside, and the card paid off. */
export function demoTransfers(today: string, monthsBack: number): DemoTransfer[] {
  const savingDate = dayIn(today, monthsBack, 2)
  const paymentDate = dayIn(today, monthsBack, 10)
  return [
    ...(savingDate <= today ? [{ date: savingDate, to: 'savings' as const, amount: 400 }] : []),
    ...(paymentDate <= today ? [{ date: paymentDate, to: 'card' as const, amount: 260 }] : []),
  ]
}
