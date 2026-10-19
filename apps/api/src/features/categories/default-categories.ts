import * as m from '@dqfinance/i18n/messages'
import type { Locale } from '../../shared/locale'
import type { category } from './category.schema'

const DEFAULTS = {
  expense: ['food', 'transport', 'housing', 'utilities', 'health', 'entertainment', 'shopping', 'education', 'family', 'subscriptions', 'other_expense'],
  income: ['salary', 'freelance', 'gifts', 'other_income'],
} as const

/** Starter categories in the user's language. They are ordinary, editable data once created. */
export const defaultCategoryRows = (userId: string, locale: Locale): (typeof category.$inferInsert)[] =>
  (['expense', 'income'] as const).flatMap((kind) =>
    DEFAULTS[kind].map((key) => ({ userId, kind, name: m[`category_default_${key}`]({}, { locale }) })),
  )
