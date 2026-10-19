/** A push service answers 404 (unknown endpoint) or 410 (gone) when a browser's subscription is dead. */
export function expiredPushStatus(status: number): boolean {
  return status === 404 || status === 410
}
