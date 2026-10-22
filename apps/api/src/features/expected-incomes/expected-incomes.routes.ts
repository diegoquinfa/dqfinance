import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createExpectedIncome, createExpectedIncomeInput } from './create-expected-income'
import { deleteExpectedIncome } from './delete-expected-income'
import { listExpectedIncomes } from './list-expected-incomes'

export const expectedIncomesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listExpectedIncomes(c.var.db, c.var.userId)))
  .post('/', jsonBody(createExpectedIncomeInput), async (c) =>
    c.json(await createExpectedIncome(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .delete('/:id', async (c) => c.json(await deleteExpectedIncome(c.var.db, c.var.userId, c.req.param('id'))))
