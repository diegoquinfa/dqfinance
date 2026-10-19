import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createCounterparty, createCounterpartyInput } from './create-counterparty'
import { listCounterparties, listCounterpartiesInput } from './list-counterparties'

export const counterpartiesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listCounterpartiesInput), async (c) =>
    c.json(await listCounterparties(c.var.db, c.var.userId, c.req.valid('query'))),
  )
  .post('/', jsonBody(createCounterpartyInput), async (c) =>
    c.json(await createCounterparty(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
