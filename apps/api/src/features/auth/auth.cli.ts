// Used only by `pnpm auth:schema` to generate auth.schema.ts. The runtime instance comes from createAuth.
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuth } from './auth'

export const auth = createAuth(
  { BETTER_AUTH_SECRET: 'schema-generation-only' } as CloudflareBindings,
  'http://localhost:3000',
  drizzleAdapter({}, { provider: 'sqlite' }),
)
