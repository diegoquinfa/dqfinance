import { sql, type SQL } from 'drizzle-orm'
import type { SourceRef } from '../accounts/source'

export type AdjustmentClaim = {
  id: string
  userId: string
  ref: SourceRef
  currency: string
  observedCents: number
  deltaCents: number
  note: string | null
  /** Instant of the adjustment, in milliseconds. */
  adjustedAt: number
  /** Instant the row is written, in milliseconds. */
  createdAt: number
}

const sourceColumn = (ref: SourceRef) =>
  ref.type === 'product'
    ? sql.raw('product_id')
    : ref.type === 'card'
      ? sql.raw('card_id')
      : sql.raw('cash_wallet_id')

/**
 * The adjustment, written only when no adjustment for the same balance landed after it was read.
 *
 * A read-then-insert guard lets two corrections that both read the same balance apply the same
 * difference twice: 100 read twice, "the real balance is 150" sent twice, the balance ends at 200.
 * Here the guard IS the statement, so the second one inserts no row and its caller answers 409.
 * `readAt` is the instant the balance was read, in milliseconds, the unit of `created_at`.
 */
export const claimAdjustment = (claim: AdjustmentClaim, readAt: number): SQL => sql`
  insert into balance_adjustment (
    id, user_id, product_id, card_id, cash_wallet_id, currency,
    observed_balance_cents, delta_cents, note, adjusted_at, created_at
  )
  select
    ${claim.id},
    ${claim.userId},
    ${claim.ref.type === 'product' ? claim.ref.id : null},
    ${claim.ref.type === 'card' ? claim.ref.id : null},
    ${claim.ref.type === 'cash_wallet' ? claim.ref.id : null},
    ${claim.currency},
    ${claim.observedCents},
    ${claim.deltaCents},
    ${claim.note},
    ${claim.adjustedAt},
    ${claim.createdAt}
  where not exists (
    select 1 from balance_adjustment
    where user_id = ${claim.userId}
      and currency = ${claim.currency}
      and ${sourceColumn(claim.ref)} = ${claim.ref.id}
      and created_at >= ${readAt}
  )
`
