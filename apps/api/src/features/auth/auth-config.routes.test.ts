import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Hono } from 'hono'
import type { AppEnv } from '../../app-env.ts'
import { authConfigRoutes } from './auth-config.routes.ts'

const app = new Hono<AppEnv>().route('/api/auth-config', authConfigRoutes)

const env = (bindings: object) => bindings as unknown as AppEnv['Bindings']

test('the flag says whether a sender is configured', async () => {
  const off = await app.request('/api/auth-config', {}, env({}))
  assert.equal(off.status, 200)
  assert.deepEqual(await off.json(), { passwordReset: false })

  const on = await app.request(
    '/api/auth-config',
    {},
    env({ EMAIL_FROM: 'no-reply@app.test', RESEND_API_KEY: 'test-key' }),
  )
  assert.deepEqual(await on.json(), { passwordReset: true })
})
