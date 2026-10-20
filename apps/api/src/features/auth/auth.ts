import { mcp } from '@better-auth/mcp'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { jwt } from 'better-auth/plugins'

// /mcp requires all of them, so per-feature scopes would add nothing yet; split them when tools check scopes individually.
export const MCP_SCOPES = ['finance:read', 'finance:write'] as const

export const mcpResource = (origin: string) => `${origin}/mcp`

// Built per request: Workers only expose bindings inside the request scope. `origin` is the
// request's: the web app and the API share it, and Cloudflare only routes hostnames bound to this Worker.
export function createAuth(env: CloudflareBindings, origin: string, database: BetterAuthOptions['database']) {
  return betterAuth({
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database,
    emailAndPassword: { enabled: true },
    // The OAuth provider issues tokens through /oauth2/token; the session JWT endpoint is not needed.
    disabledPaths: ['/token'],
    plugins: [
      jwt(),
      mcp({
        loginPage: `${origin}/sign-in`,
        consentPage: `${origin}/consent`,
        resource: mcpResource(origin),
        scopes: ['openid', 'profile', 'email', 'offline_access', ...MCP_SCOPES],
        // shortcut: DCR instead of CIMD because @better-auth/cimd ships only a Node transport;
        // switch to cimd() once a Workers-safe fetchClientMetadataResource exists.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationDefaultApplicationType: 'infer',
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
