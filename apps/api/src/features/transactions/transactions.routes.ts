import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { pushConfigFrom } from '../push/push-config'
import { sendExpensePush } from '../push/send-expense-push'
import { createTransaction, createTransactionInput } from './create-transaction'
import { listTransactions, listTransactionsInput } from './list-transactions'

export const transactionsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listTransactionsInput), async (c) =>
    c.json(await listTransactions(c.var.db, c.var.userId, c.var.locale, c.req.valid('query'))),
  )
  .post('/', jsonBody(createTransactionInput), async (c) => {
    const created = await createTransaction(c.var.db, c.var.userId, c.req.valid('json'))
    await sendExpensePush(c.var.db, c.var.userId, c.var.locale, pushConfigFrom(c.env), created.type)
    return c.json(created, 201)
  })
