/** A guest's ledger is kept this many days after the guest was created; the daily run deletes it after. */
const GUEST_RETENTION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

/** A guest created before this instant is past its retention. */
export const guestCutoff = (now: Date) => new Date(now.getTime() - GUEST_RETENTION_DAYS * DAY_MS)
