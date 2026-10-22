import * as m from '@dqfinance/i18n/messages'
import type { Context, Env } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { validator } from 'hono/validator'
import { z } from 'zod'
import type { Locale } from './locale'

export const ERROR_CODES = [
  'unauthorized',
  'invalid_input',
  'not_found',
  'internal',
  'onboarding_required',
  'already_onboarded',
  'primary_currency_required',
  'currency_not_enabled',
  'source_not_found',
  'bank_not_found',
  'bank_account_not_found',
  'product_not_found',
  'card_not_found',
  'category_not_found',
  'category_kind_mismatch',
  'category_system',
  'category_has_transactions',
  'category_merge_same',
  'counterparty_not_found',
  'primary_amount_required',
  'credit_card_required',
  'same_source',
  'received_amount_required',
  'transfer_not_found',
  'transfer_already_received',
  'recurring_not_found',
  'savings_goal_not_found',
  'expected_income_not_found',
  'push_not_configured',
  'document_not_found',
  'document_type_not_allowed',
  'document_too_large',
  'pocket_parent_required',
  'pocket_type_required',
  'pocket_parent_invalid',
  'pocket_currency_mismatch',
  'pocket_type_locked',
  'card_on_pocket',
  'transaction_not_found',
  'transaction_from_transfer',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

/** A failure the caller can act on. Its code is stable; the HTTP layer translates the message. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: ContentfulStatusCode = 400,
    readonly issues?: unknown,
  ) {
    super(code)
  }
}

export const errorMessage = (code: ErrorCode, locale: Locale) => m[`error_${code}`]({}, { locale })

/** Renders every error as `{ code, message }`, with the message in the request's language. */
export function onError<E extends Env & { Variables: { locale: Locale } }>(err: Error, c: Context<E>) {
  const locale: Locale = c.get('locale') ?? 'en'
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: errorMessage(err.code, locale), issues: err.issues }, err.status)
  }
  console.error(err)
  return c.json({ code: 'internal' as const, message: errorMessage('internal', locale) }, 500)
}

/** Validates a JSON body with a zod schema; invalid input becomes AppError('invalid_input'). */
export const jsonBody = <T extends z.ZodType>(schema: T) =>
  validator('json', (value) => parseOrThrow(schema, value))

/** Validates a multipart form; the file arrives as a File, the rest as strings. */
export const formBody = <T extends z.ZodType>(schema: T) =>
  validator('form', (value) => parseOrThrow(schema, value))

/**
 * Validates query parameters with the use case's own schema. Query values arrive as strings, so
 * number and boolean fields are converted here, at the edge, and schemas keep their real types
 * (which is also what MCP tools advertise to agents).
 */
export const queryParams = <T extends z.ZodObject>(schema: T) =>
  validator('query', (value: Record<string, string | string[]>) => parseOrThrow(schema, coerceQuery(schema, value)))

function coerceQuery(schema: z.ZodObject, query: Record<string, string | string[]>) {
  return Object.fromEntries(
    Object.entries(query).map(([key, raw]) => {
      const value = Array.isArray(raw) ? raw[0] : raw
      const field = schema.shape[key]
      const inner = field instanceof z.ZodOptional ? field.unwrap() : field
      if (inner instanceof z.ZodNumber && value !== '' && !Number.isNaN(Number(value))) return [key, Number(value)]
      if (inner instanceof z.ZodBoolean && (value === 'true' || value === 'false')) return [key, value === 'true']
      return [key, value]
    }),
  )
}

function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new AppError('invalid_input', 400, parsed.error.issues)
  return parsed.data
}

/** Throws AppError(code, 404) when a row lookup came back empty. */
export function found<T>(row: T | undefined, code: ErrorCode): T {
  if (row === undefined) throw new AppError(code, 404)
  return row
}

