import { Hono } from 'hono'
import type { AppEnv } from '../../app-env'
import { jsonBody } from '../../shared/http'
import { requireSession } from '../auth/require-session'
import { completeOnboarding, completeOnboardingInput } from './complete-onboarding'

export const onboardingRoutes = new Hono<AppEnv>()
  .use(requireSession)
  .post('/', jsonBody(completeOnboardingInput), async (c) =>
    c.json({ settings: await completeOnboarding(c.var.db, c.var.userId, c.req.valid('json')) }, 201),
  )
