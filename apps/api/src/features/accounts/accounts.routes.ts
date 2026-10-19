import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { createBank, createBankInput } from './create-bank'
import { createBankAccount, createBankAccountInput } from './create-bank-account'
import { createCard, createCardInput } from './create-card'
import { createCashWallet, createCashWalletInput } from './create-cash-wallet'
import { createProduct, createProductInput } from './create-product'
import { listAccounts } from './list-accounts'

export const accountsRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .get('/', async (c) => c.json(await listAccounts(c.var.db, c.var.userId)))
  .post('/banks', jsonBody(createBankInput), async (c) =>
    c.json(await createBank(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/bank-accounts', jsonBody(createBankAccountInput), async (c) =>
    c.json(await createBankAccount(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/products', jsonBody(createProductInput), async (c) =>
    c.json(await createProduct(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/cards', jsonBody(createCardInput), async (c) =>
    c.json(await createCard(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
  .post('/cash-wallets', jsonBody(createCashWalletInput), async (c) =>
    c.json(await createCashWallet(c.var.db, c.var.userId, c.req.valid('json')), 201),
  )
