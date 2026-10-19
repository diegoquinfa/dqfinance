import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../../app-env'
import { AppError } from '../../shared/http'

// Cookie-session guard for the web app's REST routes. MCP traffic uses OAuth bearer tokens instead (see features/mcp).
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await c.var.auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw new AppError('unauthorized', 401)
  c.set('userId', session.user.id)
  await next()
})
