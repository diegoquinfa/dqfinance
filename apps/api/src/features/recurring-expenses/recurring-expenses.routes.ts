import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { pushConfigFrom } from '../push/push-config'
import { sendPush } from '../push/send-push'
import {
  confirmRecurringExpense,
  confirmRecurringExpenseInput,
  deleteRecurringExpense,
  skipRecurringExpense,
} from './confirm-recurring-expense'
import { createRecurringExpense, createRecurringExpenseInput } from './create-recurring-expense'
import { listRecurringExpenses, listRecurringExpensesInput } from './list-recurring-expenses'

export const recurringExpensesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listRecurringExpensesInput), async (c) =>
    c.json(await listRecurringExpenses(c.var.db, c.var.userId, c.var.locale, c.req.valid('query'))),
  )
  .post('/', jsonBody(createRecurringExpenseInput), async (c) =>
    c.json(await createRecurringExpense(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/:id/confirm', jsonBody(confirmRecurringExpenseInput.omit({ id: true })), async (c) => {
    const confirmed = await confirmRecurringExpense(c.var.db, c.var.userId, {
      ...c.req.valid('json'),
      id: c.req.param('id'),
    })
    await sendPush(c.var.db, c.var.userId, c.var.locale, pushConfigFrom(c.env))
    return c.json(confirmed)
  })
  .post('/:id/skip', async (c) => c.json(await skipRecurringExpense(c.var.db, c.var.userId, { id: c.req.param('id') })))
  .delete('/:id', async (c) => c.json(await deleteRecurringExpense(c.var.db, c.var.userId, c.req.param('id'))))
