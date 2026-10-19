import { sql, type SQL } from 'drizzle-orm'
import { integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

export const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull()

export const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' })

/** Integer hundredths of the currency unit (see shared/money.ts). */
export const cents = (name: string) => integer(name)

/** CHECK expression: exactly one of the columns is set. Used for source columns. */
export const exactlyOne = (...columns: AnySQLiteColumn[]): SQL =>
  sql`(${sql.join(
    columns.map((column) => sql`(${column} is not null)`),
    sql` + `,
  )}) = 1`
