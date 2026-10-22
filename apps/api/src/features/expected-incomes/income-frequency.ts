/**
 * The income the user expects, and when it arrives next. Several of them can exist at once: a
 * salary, a freelance invoice, a monthly rent.
 */
export const INCOME_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'irregular'] as const

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number]
