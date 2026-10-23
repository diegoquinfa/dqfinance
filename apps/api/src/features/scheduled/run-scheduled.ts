import { and, eq, gt, inArray, lt } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../../db'
import { user } from '../auth/auth.schema'
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
  const guests = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.isAnonymous, true), lt(user.createdAt, guestCutoff(new Date()))))
  for (const { id } of guests) {
    try {
      await deleteGuest(db, id)
    } catch (error) {
      console.error('scheduled guest delete failed', id, error)
    }
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
 * Deletes a guest and every row it owns, in one batch. The cascade from the user row alone fails: a
 * `restrict` foreign key rejects deleting a row that a child still references, and the cascade does not
 * order the children first. guestOwnedTables lists parents before children, so the batch deletes it in
 * reverse, then the user row.
 */
async function deleteGuest(db: Db, guestId: string) {
  const statements: BatchItem<'sqlite'>[] = [...guestOwnedTables]
    .reverse()
    .map((table) => db.delete(table).where(eq(table.userId, guestId)))
  statements.push(db.delete(user).where(eq(user.id, guestId)))
  await db.batch(statements as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
}
