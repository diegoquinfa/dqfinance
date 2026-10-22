import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { deleteBudget } from './delete-budget'
import { listBudgets } from './list-budgets'
import { setBudget, setBudgetInput } from './set-budget'

export const budgetsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listBudgets(c.var.db, c.var.userId)))
  .post('/', jsonBody(setBudgetInput), async (c) =>
    c.json(await setBudget(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .delete('/:id', async (c) => c.json(await deleteBudget(c.var.db, c.var.userId, c.req.param('id'))))
