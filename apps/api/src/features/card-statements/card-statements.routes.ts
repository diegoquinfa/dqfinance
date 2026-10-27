import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { recordCardStatement, recordCardStatementInput } from './record-card-statement'

export const cardStatementsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .post('/', jsonBody(recordCardStatementInput), async (c) =>
    c.json(await recordCardStatement(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
