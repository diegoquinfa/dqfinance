import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './app-env'
import { createDb, schema } from './db'
import { accountsRoutes } from './features/accounts/accounts.routes'
import { createAuth } from './features/auth/auth'
import { balanceAdjustmentsRoutes } from './features/balance-adjustments/balance-adjustments.routes'
import { balancesRoutes } from './features/balances/balances.routes'
import { categoriesRoutes } from './features/categories/categories.routes'
import { counterpartiesRoutes } from './features/counterparties/counterparties.routes'
import { mcpRoutes } from './features/mcp/mcp.routes'
import { onboardingRoutes } from './features/onboarding/onboarding.routes'
import { recurringExpensesRoutes } from './features/recurring-expenses/recurring-expenses.routes'
import { settingsRoutes } from './features/settings/settings.routes'
import { transactionsRoutes } from './features/transactions/transactions.routes'
import { transfersRoutes } from './features/transfers/transfers.routes'
import { onError } from './shared/http'
import { resolveLocale } from './shared/locale'

const app = new Hono<AppEnv>()
  .use(async (c, next) => {
    // Per request, never cached per isolate: Better Auth starts D1 I/O on init, and Workers
    // hang when a request awaits I/O that belongs to another request.
    const db = createDb(c.env.DB)
    c.set('db', db)
    c.set('auth', createAuth(c.env, drizzleAdapter(db, { provider: 'sqlite', schema })))
    c.set('locale', resolveLocale(c.req.header('accept-language')))
    await next()
  })
  .use('/api/*', (c, next) => cors({ origin: c.env.WEB_URL, credentials: true })(c, next))
  // Better Auth serves sign-in, OAuth 2.1 endpoints, JWKS and the RFC 8414 / RFC 9728 discovery documents.
  .on(['GET', 'POST'], ['/api/auth/*', '/.well-known/*'], (c) => c.var.auth.handler(c.req.raw))
  .route('/api/settings', settingsRoutes)
  .route('/api/onboarding', onboardingRoutes)
  .route('/api/accounts', accountsRoutes)
  .route('/api/balances', balancesRoutes)
  .route('/api/categories', categoriesRoutes)
  .route('/api/counterparties', counterpartiesRoutes)
  .route('/api/transactions', transactionsRoutes)
  .route('/api/transfers', transfersRoutes)
  .route('/api/balance-adjustments', balanceAdjustmentsRoutes)
  .route('/api/recurring-expenses', recurringExpensesRoutes)
  .route('/mcp', mcpRoutes)
  .onError(onError)

export type AppType = typeof app

export default app
