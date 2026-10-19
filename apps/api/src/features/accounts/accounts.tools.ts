import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { createCard, createCardInput } from './create-card'
import { createProduct, createProductInput } from './create-product'
import { updateCard, updateCardInput } from './update-card'
import { updateProduct, updateProductInput } from './update-product'

// Setup lives in the web app, but the same fields are reachable by an agent (design → MCP tools).
export const accountTools = [
  toolDefinition({
    name: 'create_product',
    description:
      "Add a product (savings, checking, payroll, investment, other) to one of the user's bank accounts. annualRateBps is the effective annual rate in basis points (10000 = 100%).",
    inputSchema: createProductInput,
  }).server<McpContext>(async (input, ctx) => createProduct(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'update_product',
    description:
      'Change a product: its type, name, currency, or its effective annual rate in basis points (send null to clear the rate).',
    inputSchema: updateProductInput.extend({ id: z.string().min(1) }),
  }).server<McpContext>(async ({ id, ...input }, ctx) => updateProduct(ctx.context.db, ctx.context.userId, id, input)),

  toolDefinition({
    name: 'create_card',
    description:
      "Add a debit or credit card to one of the user's products. brand, interestRateBps with interestRatePeriod ('monthly' = MV, 'annual' = EA) and color are optional; the rate and limit apply to credit cards.",
    inputSchema: createCardInput,
  }).server<McpContext>(async (input, ctx) => createCard(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'update_card',
    description:
      'Change a card: name, last4, credit limit, statement and due days, brand, interest rate with its period, or color. Send null to clear an optional field.',
    inputSchema: updateCardInput.extend({ id: z.string().min(1) }),
  }).server<McpContext>(async ({ id, ...input }, ctx) => updateCard(ctx.context.db, ctx.context.userId, id, input)),
] as const
