import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { AppError, jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { deletePushSubscription, deletePushSubscriptionInput } from './delete-push-subscription'
import { savePushSubscription, savePushSubscriptionInput } from './save-push-subscription'

export const pushRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/vapid-public-key', (c) => {
    const publicKey = c.env.VAPID_PUBLIC_KEY
    if (!publicKey) throw new AppError('push_not_configured', 503)
    return c.json({ publicKey })
  })
  .put('/', jsonBody(savePushSubscriptionInput), async (c) =>
    c.json(await savePushSubscription(c.var.db, c.var.userId, c.req.valid('json'))),
  )
  .delete('/', jsonBody(deletePushSubscriptionInput), async (c) =>
    c.json(await deletePushSubscription(c.var.db, c.var.userId, c.req.valid('json'))),
  )
