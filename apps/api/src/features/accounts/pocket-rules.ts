import type { ErrorCode } from '../../shared/http'

/** The product a pocket sets money aside from, as the rules need to see it. */
export type PocketParent = {
  id: string
  type: string
  currency: string
  bankAccountId: string
}

export type PocketCreateInput = {
  type: string
  currency: string
  bankAccountId: string
  parentProductId?: string | null
}

/**
 * The error a pocket creation must fail with, or null when it is valid.
 * A pocket is a product that sets money aside inside another one: same user, same bank account,
 * same currency, one level only (design D14).
 */
export function pocketCreateError(input: PocketCreateInput, parent: PocketParent | null): ErrorCode | null {
  if (!input.parentProductId) return input.type === 'pocket' ? 'pocket_parent_required' : null
  if (input.type !== 'pocket') return 'pocket_type_required'
  if (!parent) return 'product_not_found'
  if (parent.type === 'pocket' || parent.bankAccountId !== input.bankAccountId) return 'pocket_parent_invalid'
  if (parent.currency !== input.currency) return 'pocket_currency_mismatch'
  return null
}

/**
 * The error an update must fail with, or null when it is valid.
 * A pocket keeps its type and its currency; a product with pockets keeps its currency too,
 * since the pockets inside it are in the parent's currency.
 */
export function pocketUpdateError(
  existing: { type: string; currency: string },
  input: { type?: string; currency?: string },
  hasPockets: boolean,
): ErrorCode | null {
  if (input.type && input.type !== existing.type && (existing.type === 'pocket' || input.type === 'pocket')) {
    return 'pocket_type_locked'
  }
  if (input.currency && input.currency !== existing.currency && (existing.type === 'pocket' || hasPockets)) {
    return 'pocket_currency_mismatch'
  }
  return null
}

/** A pocket has no cards (design D14). */
export function cardProductError(productType: string): ErrorCode | null {
  return productType === 'pocket' ? 'card_on_pocket' : null
}
