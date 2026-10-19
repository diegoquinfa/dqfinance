import { mcp } from '@better-auth/mcp'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { jwt } from 'better-auth/plugins'

// /mcp requires all of them, so per-feature scopes would add nothing yet; split them when tools check scopes individually.
export const MCP_SCOPES = ['finance:read', 'finance:write'] as const

export const mcpResource = (env: CloudflareBindings) => `${env.BETTER_AUTH_URL}/mcp`

// Built per request: Workers only expose bindings and vars inside the request scope.
export function createAuth(env: CloudflareBindings, database: BetterAuthOptions['database']) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: [env.WEB_URL],
    emailAndPassword: { enabled: true },
    // The OAuth provider issues tokens through /oauth2/token; the session JWT endpoint is not needed.
    disabledPaths: ['/token'],
    plugins: [
      jwt(),
      mcp({
        loginPage: `${env.WEB_URL}/sign-in`,
        consentPage: `${env.WEB_URL}/consent`,
        resource: mcpResource(env),
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
