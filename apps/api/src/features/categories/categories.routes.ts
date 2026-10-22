import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody, queryParams } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createCategory, createCategoryInput } from './create-category'
import { deleteCategory } from './delete-category'
import { listCategories, listCategoriesInput } from './list-categories'
import { mergeCategories, mergeCategoriesInput } from './merge-categories'
import { updateCategory, updateCategoryInput } from './update-category'

export const categoriesRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', queryParams(listCategoriesInput), async (c) =>
    c.json(await listCategories(c.var.db, c.var.userId, c.var.locale, c.req.valid('query'))),
  )
  .post('/', jsonBody(createCategoryInput), async (c) =>
    c.json(await createCategory(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  // Before the id routes, so "merge" is never read as an id.
  .post('/merge', jsonBody(mergeCategoriesInput), async (c) =>
    c.json(await mergeCategories(c.var.db, c.var.userId, c.req.valid('json'))),
  )
  .patch('/:id', jsonBody(updateCategoryInput), async (c) =>
    c.json(await updateCategory(c.var.db, c.var.userId, c.req.param('id'), c.req.valid('json'))),
  )
  .delete('/:id', async (c) => c.json(await deleteCategory(c.var.db, c.var.userId, c.req.param('id'))))
