import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { addContribution, addContributionInput } from './add-contribution'
import { createGoal, createGoalInput } from './create-goal'
import { deleteGoal } from './delete-goal'
import { listGoals } from './list-goals'

export const savingsGoalsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listGoals(c.var.db, c.var.userId)))
  .post('/', jsonBody(createGoalInput), async (c) =>
    c.json(await createGoal(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/contributions', jsonBody(addContributionInput), async (c) =>
    c.json(await addContribution(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .delete('/:id', async (c) => c.json(await deleteGoal(c.var.db, c.var.userId, c.req.param('id'))))
