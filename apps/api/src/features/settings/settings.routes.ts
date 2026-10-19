import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { getSettings } from './get-settings'
import { updateSettings, updateSettingsInput } from './update-settings'

export const settingsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json({ settings: await getSettings(c.var.db, c.var.userId) }))
  .patch('/', jsonBody(updateSettingsInput), async (c) =>
    c.json(await updateSettings(c.var.db, c.var.userId, c.req.valid('json'))),
  )
