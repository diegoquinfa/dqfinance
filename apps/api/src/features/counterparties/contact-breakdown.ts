import type { Locale } from '../../shared/locale'
import { fromCents } from '../../shared/money.ts'
import { categoryName } from '../categories/category-display.ts'
import type { SystemCategoryKey } from '../categories/category.schema.ts'

/** One row of the grouped totals: a currency and what moved in it. */
export type TotalsRow = {
  currency: string
  spentCents: number
  receivedCents: number
  movements: number
  expenses: number
  firstAt: number | null
  lastAt: number | null
}

/** One row of the grouped breakdown: a category and a currency. */
export type CategoryRow = {
  categoryId: string | null
  categoryName: string | null
  categorySystemKey: SystemCategoryKey | null
  categoryKind: 'expense' | 'income' | null
  currency: string
  amountCents: number
  movements: number
}

export type ContactTotals = {
  currency: string
  spent: number
  received: number
  /** The average of what was spent, in that currency. */
  average: number | null
}

export type ContactCategory = {
  categoryId: string
  name: string
  kind: 'expense' | 'income'
  currency: string
  amount: number
  movements: number
}

/**
 * The zone's offset from UTC at an instant, in seconds: how far its wall clock is ahead of UTC.
 * Intl reads the offset in effect at that instant, so a zone with daylight saving time reports
 * the summer or the winter one, whichever the instant falls in.
 */
export const offsetSecondsAt = (timeZone: string, instant: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const part = (type: string) => Number(values[type])
  const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
  return Math.round((wall - instant.getTime()) / 1000)
}

/**
 * The money a contact moved, per currency, and when it moved. Money never mixes currencies, so
 * each one has its own line and its own average.
 */
export function contactTotals(rows: TotalsRow[]) {
  const totals: ContactTotals[] = rows.map((row) => ({
    currency: row.currency,
    spent: fromCents(row.spentCents),
    received: fromCents(row.receivedCents),
    average: row.expenses > 0 ? fromCents(row.spentCents / row.expenses) : null,
  }))
  const movements = rows.reduce((sum, row) => sum + row.movements, 0)
  const earliest = rows.reduce<number | null>(
    (value, row) => (row.firstAt !== null && (value === null || row.firstAt < value) ? row.firstAt : value),
    null,
  )
  const latest = rows.reduce<number | null>(
    (value, row) => (row.lastAt !== null && (value === null || row.lastAt > value) ? row.lastAt : value),
    null,
  )
  return {
    totals,
    movements,
    firstMovementAt: earliest === null ? null : new Date(earliest).toISOString(),
    lastMovementAt: latest === null ? null : new Date(latest).toISOString(),
  }
}

/**
 * What the contact moved the money for: one line per category and currency, the biggest first.
 * A system category has no stored name, so it is translated here.
 */
export function contactCategories(rows: CategoryRow[], locale: Locale): ContactCategory[] {
  return rows
    .filter((row) => row.categoryId !== null && row.categoryKind !== null)
    .map((row) => ({
      categoryId: row.categoryId!,
      name: categoryName({ name: row.categoryName, systemKey: row.categorySystemKey }, locale),
      kind: row.categoryKind!,
      currency: row.currency,
      amount: fromCents(row.amountCents),
      movements: row.movements,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}
