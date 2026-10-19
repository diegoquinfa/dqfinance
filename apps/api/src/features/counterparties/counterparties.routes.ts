import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createCounterparty, createCounterpartyInput } from './create-counterparty'
import { deleteCounterparty } from './delete-counterparty'
import { listCounterparties, listCounterpartiesInput } from './list-counterparties'
import { updateCounterparty, updateCounterpartyInput } from './update-counterparty'

export const counterpartiesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listCounterpartiesInput), async (c) =>
    c.json(await listCounterparties(c.var.db, c.var.userId, c.req.valid('query'))),
  )
  .post('/', jsonBody(createCounterpartyInput), async (c) =>
    c.json(await createCounterparty(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .patch('/:id', jsonBody(updateCounterpartyInput), async (c) =>
    c.json(await updateCounterparty(c.var.db, c.var.userId, c.req.param('id'), c.req.valid('json'))),
  )
  .delete('/:id', async (c) => c.json(await deleteCounterparty(c.var.db, c.var.userId, c.req.param('id'))))
