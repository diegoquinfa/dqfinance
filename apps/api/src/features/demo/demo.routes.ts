import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { requireSession } from '../auth/require-session'
import { userSettings } from '../settings/settings.schema'
import { seedDemo } from './seed-demo'

/**
 * The demo ledger. A guest calls it once and finds the app filled with sample data; calling
 * it again does nothing, so the web can call it on every load.
 */
export const demoRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .post('/', async (c) => {
    try {
      return c.json(await seedDemo(c.var.db, c.var.userId, c.var.locale), 201)
    } catch (error) {
      // Another tab seeded it first: the batch lost the race on the settings row. The ledger is
      // there, so the seed is done and not a failure.
      const seeded = await c.var.db
        .select({ userId: userSettings.userId })
        .from(userSettings)
        .where(eq(userSettings.userId, c.var.userId))
        .get()
      if (seeded) return c.json({ seeded: true })
      throw error
    }
  })
