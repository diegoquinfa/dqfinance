import { and, eq, gt, inArray, lt, notExists } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../../db'
import { session, user } from '../auth/auth.schema'
import { guestOwnedTables } from '../demo/move-guest-data'
import { userSettings } from '../settings/settings.schema'
import { checkDueBills } from '../webhooks/check-due-bills'
import { webhook } from '../webhooks/webhook.schema'
import { guestCutoff } from './guest-retention'

/**
 * The daily run (the cron in wrangler.jsonc). It deletes the guests past their retention, then checks the
 * bills of each user who asked for a reminder and has an active hook, so a reminder does not wait for the
 * user to open the app. A guest or a bill check that fails is logged, and the rest still run.
 */
export async function runScheduled(db: Db) {
  try {
    await deleteAbandonedGuests(db, new Date())
  } catch (error) {
    console.error('scheduled guest delete failed', error)
  }

  const reminded = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(
      and(
        gt(userSettings.reminderLeadDays, 0),
        inArray(userSettings.userId, db.select({ userId: webhook.userId }).from(webhook).where(eq(webhook.active, true))),
      ),
    )
  for (const { userId } of reminded) {
    try {
      await checkDueBills(db, userId)
    } catch (error) {
      console.error('scheduled bill check failed', userId, error)
    }
  }
}

/**
 * Deletes the abandoned guests and every row they own, in one batch: one statement per table whatever
 * the number of guests, so a backlog stays inside D1's per-invocation query limit. A guest is abandoned
 * when it is past its retention and no session of it is still alive; a guest still using the app keeps
 * its ledger. The cascade from the user row alone fails: a `restrict` foreign key rejects deleting a row
 * that a child still references, and the cascade does not order the children first. guestOwnedTables
 * lists parents before children, so the batch deletes them in reverse, then the user rows.
 */
async function deleteAbandonedGuests(db: Db, now: Date) {
  const abandoned = db
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        eq(user.isAnonymous, true),
        lt(user.createdAt, guestCutoff(now)),
        notExists(db.select({ id: session.id }).from(session).where(and(eq(session.userId, user.id), gt(session.expiresAt, now)))),
      ),
    )
  const statements: BatchItem<'sqlite'>[] = [...guestOwnedTables]
    .reverse()
    .map((table) => db.delete(table).where(inArray(table.userId, abandoned)))
  statements.push(db.delete(user).where(inArray(user.id, abandoned)))
  await db.batch(statements as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
}
