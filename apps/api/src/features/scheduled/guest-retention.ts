/** A guest is kept at least this many days after it was created, and for as long as a session of it is alive. */
const GUEST_RETENTION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

/** A guest created before this instant is past its retention. */
export const guestCutoff = (now: Date) => new Date(now.getTime() - GUEST_RETENTION_DAYS * DAY_MS)
