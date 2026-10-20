import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { createBank, createBankInput } from './create-bank'
import { createBankAccount, createBankAccountInput } from './create-bank-account'
import { createCard, createCardInput } from './create-card'
import { createCashWallet, createCashWalletInput } from './create-cash-wallet'
import { createProduct, createProductInput } from './create-product'
import { updateCard, updateCardInput } from './update-card'
import { updateProduct, updateProductInput } from './update-product'

// Setup lives in the web app, but the same fields are reachable by an agent (design → MCP tools).
export const accountTools = [
  toolDefinition({
    name: 'create_bank',
    description:
      "Add a bank the user holds accounts at. Check list_accounts first so the same bank is not added twice.",
    inputSchema: createBankInput,
  }).server<McpContext>(async (input, ctx) => createBank(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'create_bank_account',
    description:
      "Add an account to one of the user's banks, with optional last4. It holds no money itself: add a product to it with create_product.",
    inputSchema: createBankAccountInput,
  }).server<McpContext>(async (input, ctx) => createBankAccount(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'create_cash_wallet',
    description: 'Add a cash wallet in one of the currencies the user has enabled. Set its balance with adjust_balance.',
    inputSchema: createCashWalletInput,
  }).server<McpContext>(async (input, ctx) => createCashWallet(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'create_product',
    description:
      "Add a product (savings, checking, payroll, investment, other) to one of the user's bank accounts. annualRateBps is the effective annual rate in basis points (10000 = 100%). A product of type 'pocket' with parentProductId sets money aside inside that product.",
    inputSchema: createProductInput,
  }).server<McpContext>(async (input, ctx) => createProduct(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'update_product',
    description:
      "Change a product: its type, name, currency, its effective annual rate in basis points (send null to clear the rate), or yieldPayout ('daily' or 'monthly'), how often its interest is paid.",
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
