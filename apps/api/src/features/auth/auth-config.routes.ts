import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { emailSenderFrom } from '../email/email-sender.ts'

/** What the web needs to know before anyone signs in. No secrets. */
export const authConfigRoutes = new Hono<AppEnv>().get('/', (c) =>
  c.json({ passwordReset: emailSenderFrom(c.env) !== null }),
)
