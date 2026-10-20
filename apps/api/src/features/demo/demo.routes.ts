import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { requireSession } from '../auth/require-session'
import { seedDemo } from './seed-demo'

/**
 * The demo ledger. A guest calls it once and finds the app filled with sample data; calling
 * it again does nothing, so the web can call it on every load.
 */
export const demoRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .post('/', async (c) => c.json(await seedDemo(c.var.db, c.var.userId, c.var.locale), 201))
