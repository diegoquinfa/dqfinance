import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { getCalendar, getCalendarInput } from './get-calendar'

export const calendarRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(getCalendarInput), async (c) =>
    c.json(await getCalendar(c.var.db, c.var.userId, c.var.locale, c.req.valid('query'))),
  )
