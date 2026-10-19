import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
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
  .post('/', jsonBody(createTransactionInput), async (c) =>
    c.json(await createTransaction(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
