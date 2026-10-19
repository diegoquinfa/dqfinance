import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { adjustBalance, adjustBalanceInput } from './adjust-balance'
import { listBalanceAdjustments } from './list-balance-adjustments'

export const balanceAdjustmentsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listBalanceAdjustments(c.var.db, c.var.userId)))
  .post('/', jsonBody(adjustBalanceInput), async (c) =>
    c.json(await adjustBalance(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
