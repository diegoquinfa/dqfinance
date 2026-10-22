import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { requireSession } from '../auth/require-session'
import { getForecast } from './get-forecast'
import { getSafeToSpend } from './get-safe-to-spend'

export const spendingRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/safe-to-spend', async (c) => c.json(await getSafeToSpend(c.var.db, c.var.userId)))
  .get('/forecast', async (c) => c.json(await getForecast(c.var.db, c.var.userId)))
