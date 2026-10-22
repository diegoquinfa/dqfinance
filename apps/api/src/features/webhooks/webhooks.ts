import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { publicUrl } from '../../shared/public-url'
import { found } from '../../shared/http'
import { webhook } from './webhook.schema'

export const createWebhookInput = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => publicUrl(value) !== null, 'The webhook URL must be a public https URL'),
  secret: z
    .string()
    .min(8)
    .max(200)
    .describe('The secret the signature is made with; the user chooses it and keeps it'),
})

/** What a webhook looks like to the web and to an agent. The secret never leaves the app. */
export type WebhookView = {
  id: string
  url: string
  /** The last characters of the secret, so two hooks can be told apart. */
  secretLast4: string
  createdAt: string
}

export const webhookView = (row: typeof webhook.$inferSelect): WebhookView => ({
  id: row.id,
  url: row.url,
  secretLast4: row.secret.slice(-4),
  createdAt: row.createdAt.toISOString(),
})

/** Adds a place the app calls. */
export async function createWebhook(db: Db, userId: string, input: z.infer<typeof createWebhookInput>) {
  const [row] = await db.insert(webhook).values({ userId, url: input.url, secret: input.secret }).returning()
  return webhookView(row!)
}

/** The hooks of the user. */
export async function listWebhooks(db: Db, userId: string): Promise<WebhookView[]> {
  const rows = await db.select().from(webhook).where(eq(webhook.userId, userId))
  return rows.map(webhookView)
}

/** Removes a hook. */
export async function deleteWebhook(db: Db, userId: string, id: string) {
  found(
    await db.select({ id: webhook.id }).from(webhook).where(and(eq(webhook.id, id), eq(webhook.userId, userId))).get(),
    'webhook_not_found',
  )
  await db.delete(webhook).where(and(eq(webhook.id, id), eq(webhook.userId, userId)))
  return { id, deleted: true }
}
