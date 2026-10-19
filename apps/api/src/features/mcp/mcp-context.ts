import type { MCPToolContext } from '@tanstack/ai-mcp/server'
import type { Db } from '../../db'
import type { Locale } from '../../shared/locale'

/** What every MCP tool receives on ctx.context. Filled per request in mcp.routes.ts. */
export type McpContext = MCPToolContext<{ db: Db; userId: string; locale: Locale }>
