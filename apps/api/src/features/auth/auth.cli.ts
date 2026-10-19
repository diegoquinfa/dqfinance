// Used only by `pnpm auth:schema` to generate auth.schema.ts. The runtime instance comes from createAuth.
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuth } from './auth'

export const auth = createAuth(
  {
    BETTER_AUTH_URL: 'http://localhost:8787',
    WEB_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'schema-generation-only',
  } as CloudflareBindings,
  drizzleAdapter({}, { provider: 'sqlite' }),
)
