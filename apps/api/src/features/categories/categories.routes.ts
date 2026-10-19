import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createCategory, createCategoryInput } from './create-category'
import { listCategories, listCategoriesInput } from './list-categories'

export const categoriesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listCategoriesInput), async (c) =>
    c.json(await listCategories(c.var.db, c.var.userId, c.var.locale, c.req.valid('query'))),
  )
  .post('/', jsonBody(createCategoryInput), async (c) =>
    c.json(await createCategory(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
