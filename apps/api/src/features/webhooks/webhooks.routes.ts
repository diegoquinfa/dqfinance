import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { checkDueBills } from './check-due-bills'
import { createWebhook, createWebhookInput, deleteWebhook, listWebhooks } from './webhooks'

export const webhooksRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listWebhooks(c.var.db, c.var.userId)))
  .post('/', jsonBody(createWebhookInput), async (c) =>
    c.json(await createWebhook(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/check', async (c) => c.json(await checkDueBills(c.var.db, c.var.userId)))
  .delete('/:id', async (c) => c.json(await deleteWebhook(c.var.db, c.var.userId, c.req.param('id'))))
