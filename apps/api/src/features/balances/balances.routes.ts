import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { requireSession } from '../auth/require-session'
import { getBalances, toBalancesView } from './get-balances'

export const balancesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(toBalancesView(await getBalances(c.var.db, c.var.userId))))
