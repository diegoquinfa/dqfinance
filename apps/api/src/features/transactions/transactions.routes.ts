import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { pushConfigFrom } from '../push/push-config'
import { sendPush } from '../push/send-push'
import { createTransaction, createTransactionInput } from './create-transaction'
import { listTransactions, listTransactionsInput } from './list-transactions'
import { summarizeTransactions, summarizeTransactionsInput } from './summarize-transactions'

export const transactionsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listTransactionsInput), async (c) =>
    c.json(await listTransactions(c.var.db, c.var.userId, c.var.locale, c.req.valid('query'))),
  )
  .get('/summary', queryParams(summarizeTransactionsInput), async (c) =>
    c.json(await summarizeTransactions(c.var.db, c.var.userId, c.req.valid('query'))),
  )
  .post('/', jsonBody(createTransactionInput), async (c) => {
    const created = await createTransaction(c.var.db, c.var.userId, c.req.valid('json'))
    await sendPush(c.var.db, c.var.userId, c.var.locale, pushConfigFrom(c.env), created.type)
    return c.json(created, 201)
  })
