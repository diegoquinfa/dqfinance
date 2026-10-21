import { and, eq, gte, inArray, lt } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, isoDateTime } from '../../shared/dates'
import { AppError } from '../../shared/http'
import type { Locale } from '../../shared/locale'
import { moneyAmount, toCents } from '../../shared/money'
import { resolveSource, sourceColumns, sourceRef, type SourceRef } from '../accounts/source'
import { category } from '../categories/category.schema'
import { categoryName, systemCategoryId } from '../categories/system-categories'
import { DESCRIPTION_MAX, TITLE_MAX } from './create-transaction'
import { duplicateFlags, type MovementFingerprint } from './duplicate'
import { TRANSACTION_TYPES, transaction } from './transaction.schema'

export const MAX_IMPORT_ROWS = 500

export const importTransactionsInput = z.object({
  source: sourceRef.describe('The source every row belongs to. Get ids from list_accounts.'),
  rows: z
    .array(
      z.object({
        type: z.enum(TRANSACTION_TYPES),
        amount: moneyAmount.describe('Positive decimal amount (not cents), in the source currency'),
        occurredAt: z
          .union([isoDate, isoDateTime])
          .describe('YYYY-MM-DD, or an ISO 8601 datetime when the time is known'),
        title: z.string().trim().max(TITLE_MAX).optional().describe('Short name of the movement, from the statement'),
        description: z
          .string()
          .trim()
          .max(DESCRIPTION_MAX)
          .optional()
          .describe('Longer details, when the statement has them'),
        categoryId: z
          .string()
          .min(1)
          .optional()
          .describe('From list_categories. Omit to book as "Other expenses" or "Other income".'),
      }),
    )
    .min(1)
    .max(MAX_IMPORT_ROWS),
  dryRun: z
    .boolean()
    .describe('True previews every row and writes nothing. Show the user the preview, then import.'),
})

export type ImportTransactionsInput = z.infer<typeof importTransactionsInput>

export type ImportRowView = {
  type: 'income' | 'expense'
  amount: number
  occurredAt: string
  title: string | null
  description: string | null
  categoryId: string
  categoryName: string
  duplicate: boolean
}

export type ImportView = { created: number; skipped: number; rows: ImportRowView[] }

type ParsedRow = {
  type: 'income' | 'expense'
  amount: number
  amountCents: number
  at: Date
  title: string | null
  description: string | null
  categoryId?: string
}

/**
 * Records many movements of one source from a statement. Rows that look like a movement already
 * recorded there are skipped. With dryRun nothing is written: the preview says which rows those are.
 */
export async function importTransactions(
  db: Db,
  userId: string,
  locale: Locale,
  input: ImportTransactionsInput,
): Promise<ImportView> {
  const source = await resolveSource(db, userId, input.source)
  const rows: ParsedRow[] = input.rows.map((row) => ({
    type: row.type,
    amount: row.amount,
    amountCents: toCents(row.amount),
    at: parseOccurredAt(row.occurredAt),
    title: row.title || null,
    description: row.description || null,
    categoryId: row.categoryId,
  }))

  const [existing, categories] = await Promise.all([
    existingMovements(db, userId, source.ref, rows),
    categoriesOf(db, userId, locale, rows),
  ])
  const duplicates = duplicateFlags(
    rows.map((row) => ({ type: row.type, amountCents: row.amountCents, occurredAt: row.at, title: row.title })),
    existing,
  )
  const preview = rows.map((row, index) => ({
    type: row.type,
    amount: row.amount,
    occurredAt: input.rows[index]!.occurredAt,
    title: row.title,
    description: row.description,
    categoryId: categories[index]!.id,
    categoryName: categories[index]!.name,
    duplicate: duplicates[index]!,
  }))
  if (input.dryRun) return { created: 0, skipped: 0, rows: preview }

  const fresh = rows.flatMap((row, index) => (duplicates[index] ? [] : [{ row, categoryId: categories[index]!.id }]))
  // D1 allows 100 bound parameters per statement, so the rows go in chunks; one batch keeps them atomic.
  if (fresh.length) {
    const statements = chunks(fresh, ROWS_PER_STATEMENT).map((chunk) =>
      db.insert(transaction).values(
        chunk.map(({ row, categoryId }) => ({
          userId,
          type: row.type,
          amountCents: row.amountCents,
          currency: source.currency,
          ...sourceColumns(source.ref),
          categoryId,
          title: row.title,
          description: row.description,
          occurredAt: row.at,
        })),
      ),
    )
    await db.batch([statements[0]!, ...statements.slice(1)])
  }
  return { created: fresh.length, skipped: rows.length - fresh.length, rows: preview }
}

/** A calendar date is midnight UTC; a datetime keeps its instant. */
const parseOccurredAt = (value: string) => (value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value))

/** 10 bound columns per row, kept well under D1's 100-variable statement limit. */
const ROWS_PER_STATEMENT = 8

const chunks = <T>(rows: T[], size: number) =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))

/** One source's movements, narrowed to the calendar days the batch touches. */
async function existingMovements(db: Db, userId: string, ref: SourceRef, rows: ParsedRow[]): Promise<MovementFingerprint[]> {
  const days = rows.map((row) => row.at.toISOString().slice(0, 10)).sort()
  const from = new Date(`${days[0]}T00:00:00Z`)
  const to = new Date(`${days[days.length - 1]}T00:00:00Z`)
  to.setUTCDate(to.getUTCDate() + 1)

  return db
    .select({
      type: transaction.type,
      amountCents: transaction.amountCents,
      occurredAt: transaction.occurredAt,
      title: transaction.title,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        ref.type === 'product'
          ? eq(transaction.productId, ref.id)
          : ref.type === 'card'
            ? eq(transaction.cardId, ref.id)
            : eq(transaction.cashWalletId, ref.id),
        gte(transaction.occurredAt, from),
        lt(transaction.occurredAt, to),
      ),
    )
}

type ResolvedCategory = { id: string; name: string }

/**
 * The category each row is booked in, in row order: the one it names, else the system "Other
 * expenses" / "Other income", created on first use and translated on read.
 */
async function categoriesOf(db: Db, userId: string, locale: Locale, rows: ParsedRow[]) {
  const chosen = [...new Set(rows.flatMap((row) => (row.categoryId ? [row.categoryId] : [])))]
  const found = chosen.length
    ? await db
        .select({ id: category.id, kind: category.kind, name: category.name, systemKey: category.systemKey })
        .from(category)
        .where(and(eq(category.userId, userId), inArray(category.id, chosen)))
    : []
  const byId = new Map(found.map((row) => [row.id, row]))
  const others = new Map<'income' | 'expense', ResolvedCategory>()

  const resolved: ResolvedCategory[] = []
  for (const row of rows) {
    if (row.categoryId) {
      const picked = byId.get(row.categoryId)
      if (!picked) throw new AppError('category_not_found', 404)
      if (picked.kind !== row.type) throw new AppError('category_kind_mismatch')
      resolved.push({ id: picked.id, name: categoryName(picked, locale) })
      continue
    }
    let other = others.get(row.type)
    if (!other) {
      const key = row.type === 'income' ? 'other_income' : 'other_expense'
      other = { id: await systemCategoryId(db, userId, key), name: categoryName({ name: null, systemKey: key }, locale) }
      others.set(row.type, other)
    }
    resolved.push(other)
  }
  return resolved
}
