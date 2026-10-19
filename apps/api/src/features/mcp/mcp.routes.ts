import { requireMcpAuth } from '@better-auth/mcp'
import { createMCPServer } from '@tanstack/ai-mcp/server'
import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { MCP_SCOPES, mcpResource } from '../auth/auth'
import { balanceAdjustmentTools } from '../balance-adjustments/balance-adjustments.tools'
import { balanceTools } from '../balances/balances.tools'
import { categoryTools } from '../categories/categories.tools'
import { counterpartyTools } from '../counterparties/counterparties.tools'
import { recurringExpenseTools } from '../recurring-expenses/recurring-expenses.tools'
import { getSettings } from '../settings/get-settings'
import { transactionTools } from '../transactions/transactions.tools'
import { transferTools } from '../transfers/transfers.tools'

// Each feature contributes its tools here.
const mcpServer = createMCPServer({
  name: 'dqfinance',
  version: '0.2.0',
  tools: [
    ...balanceTools,
    ...categoryTools,
    ...counterpartyTools,
    ...transactionTools,
    ...transferTools,
    ...balanceAdjustmentTools,
    ...recurringExpenseTools,
  ],
})

export const mcpRoutes = new Hono<AppEnv>().all('/', (c) =>
  requireMcpAuth(
    c.var.auth,
    async (request, claims) => {
      if (!claims.sub) return Response.json({ error: 'invalid_token' }, { status: 401 })
      // Agents get system category names in the user's saved language.
      const locale = (await getSettings(c.var.db, claims.sub))?.locale ?? 'en'
      return mcpServer.handle(request, { context: { db: c.var.db, userId: claims.sub, locale } })
    },
    { resource: mcpResource(c.env), requiredScopes: MCP_SCOPES },
  )(c.req.raw),
)
