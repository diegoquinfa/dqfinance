/**
 * The rule that keeps an agent away from a guest's money.
 *
 * A guest explores the app, but it never hands its ledger to somebody else's software.
 * The rule is on its own, so it can be checked without a database.
 */
export function blocksMcp(row: { isAnonymous?: boolean | null } | undefined): boolean {
  // A user that no longer exists owns nothing, so the token is stale.
  if (!row) return true
  return row.isAnonymous === true
}
