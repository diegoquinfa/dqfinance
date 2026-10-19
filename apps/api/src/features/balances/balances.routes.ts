import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { balanceHistoryInput, getBalanceHistory, toHistoryView } from './get-balance-history'
import { getBalances, toBalancesView } from './get-balances'

export const balancesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(toBalancesView(await getBalances(c.var.db, c.var.userId))))
  .get('/history', queryParams(balanceHistoryInput), async (c) =>
    c.json(toHistoryView(await getBalanceHistory(c.var.db, c.var.userId, c.req.valid('query')))),
  )
