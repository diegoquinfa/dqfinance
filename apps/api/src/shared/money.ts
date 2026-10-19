import { z } from 'zod'

// Amounts are stored as integer hundredths of the currency unit for every currency.
// Not ISO minor units on purpose: ICU reports 0 digits for COP, which would silently round away cents.
export const toCents = (amount: number) => Math.round(amount * 100)

export const fromCents = (cents: number) => cents / 100

/** A positive decimal amount with at most 2 decimals, e.g. 45000.5. */
export const moneyAmount = z.number().positive().multipleOf(0.01)

/** ISO 4217 code, normalized to upper case. */
export const currencyCode = z
  .string()
  .length(3)
  .toUpperCase()
  .refine((code) => Intl.supportedValuesOf('currency').includes(code), 'Unknown ISO 4217 currency')
