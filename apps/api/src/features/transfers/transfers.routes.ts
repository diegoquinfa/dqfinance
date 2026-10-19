import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createTransfer, createTransferInput } from './create-transfer'
import { listTransfers, listTransfersInput } from './list-transfers'
import { markTransferReceived, markTransferReceivedInput } from './mark-transfer-received'

export const transfersRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listTransfersInput), async (c) =>
    c.json(await listTransfers(c.var.db, c.var.userId, c.req.valid('query'))),
  )
  .post('/', jsonBody(createTransferInput), async (c) =>
    c.json(await createTransfer(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/:id/received', jsonBody(markTransferReceivedInput.omit({ id: true })), async (c) =>
    c.json(await markTransferReceived(c.var.db, c.var.userId, { ...c.req.valid('json'), id: c.req.param('id') })),
  )
