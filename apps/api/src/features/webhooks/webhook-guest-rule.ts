/**
 * The rule that keeps a guest from making the app call out for it.
 *
 * A webhook sends the user's bills to a URL of the user's choosing, and the app calls it on every
 * check. A guest explores the app, so it may not set one up or run the check. The rule is on its
 * own, so it can be checked without a database.
 */
export function blocksWebhooks(row: { isAnonymous?: boolean | null } | undefined): boolean {
  return row?.isAnonymous === true
}
