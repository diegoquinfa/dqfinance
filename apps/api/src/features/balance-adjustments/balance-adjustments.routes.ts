import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { pushConfigFrom } from '../push/push-config'
import { sendPush } from '../push/send-push'
import { adjustBalance, adjustBalanceInput } from './adjust-balance'
import { listBalanceAdjustments } from './list-balance-adjustments'

export const balanceAdjustmentsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listBalanceAdjustments(c.var.db, c.var.userId)))
  .post('/', jsonBody(adjustBalanceInput), async (c) => {
    const adjusted = await adjustBalance(c.var.db, c.var.userId, c.req.valid('json'))
    // A zero delta records nothing, so there is nothing to announce.
    if (adjusted.delta !== 0) {
      await sendPush(c.var.db, c.var.userId, c.var.locale, pushConfigFrom(c.env), 'balance_adjustment')
    }
    return c.json(adjusted, 201)
  })
