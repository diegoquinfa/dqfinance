import { mcp } from '@better-auth/mcp'
import * as m from '@dqfinance/i18n/messages'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { anonymous, jwt } from 'better-auth/plugins'
import { resolveLocale } from '../../shared/locale.ts'
import { emailSenderFrom, type EmailEnv } from '../email/email-sender.ts'
import { passwordResetMessage } from '../email/password-reset-message.ts'
import { confirmPasswordProblem, MIN_PASSWORD_LENGTH, type PasswordConfirmProblem } from './confirm-password.ts'

// /mcp requires all of them, so per-feature scopes would add nothing yet; split them when tools check scopes individually.
export const MCP_SCOPES = ['finance:read', 'finance:write'] as const

export const mcpResource = (origin: string) => `${origin}/mcp`

/** The page the reset link lands on; the web reads the token from its query. */
const RESET_PASSWORD_PATH = '/reset-password'

/** The OAuth endpoint that hands an access token to an agent. A guest never gets one. */
const AUTHORIZE_PATH = '/oauth2/authorize'

/** The field each route repeats: sign-up repeats the password, the others the new one. */
const CONFIRMED_PASSWORD_FIELD = {
  '/sign-up/email': 'password',
  '/change-password': 'newPassword',
  '/reset-password': 'newPassword',
} as const

/** Better Auth error codes, so a client can tell the cases apart. */
const CONFIRM_PROBLEM_CODE = {
  missing: 'PASSWORD_CONFIRMATION_MISSING',
  mismatch: 'PASSWORD_CONFIRMATION_MISMATCH',
  too_short: 'PASSWORD_TOO_SHORT',
} as const satisfies Record<PasswordConfirmProblem, string>

/** The translated message for each case. */
const CONFIRM_PROBLEM_MESSAGE = {
  missing: 'auth_password_confirm_missing',
  mismatch: 'auth_password_confirm_mismatch',
  too_short: 'auth_password_too_short',
} as const satisfies Record<PasswordConfirmProblem, keyof typeof m>

/**
 * Runs before every Better Auth endpoint, on the raw body.
 * - a guest may not authorize an agent: no access token is issued for a guest session;
 * - the repeated password is checked here, so a client that skips the field still fails;
 * - a reset request without a target gets the page the link must land on.
 * Better Auth's own body schemas drop `confirmPassword` afterwards, and sign-up never stores it.
 */
function beforeEndpoint(origin: string) {
  return createAuthMiddleware(async (ctx) => {
    if (ctx.path === AUTHORIZE_PATH) {
      const session = await getSessionFromCtx(ctx, { disableRefresh: true })
      if (session?.user.isAnonymous) {
        throw APIError.from('FORBIDDEN', { code: 'GUEST_MCP_DENIED', message: m.guest_mcp_denied() })
      }
    }
    if (ctx.path === '/request-password-reset') {
      if (ctx.body?.redirectTo) return
      return { context: { body: { ...ctx.body, redirectTo: `${origin}${RESET_PASSWORD_PATH}` } } }
    }
    const field = CONFIRMED_PASSWORD_FIELD[ctx.path as keyof typeof CONFIRMED_PASSWORD_FIELD]
    if (!field) return
    const problem = confirmPasswordProblem(ctx.body?.[field], ctx.body?.confirmPassword)
    if (!problem) return
    const locale = resolveLocale(ctx.request?.headers.get('accept-language'))
    const message =
      problem === 'too_short'
        ? m.auth_password_too_short({ min: MIN_PASSWORD_LENGTH }, { locale })
        : m[CONFIRM_PROBLEM_MESSAGE[problem]]({}, { locale })
    throw APIError.from('BAD_REQUEST', {
      code: CONFIRM_PROBLEM_CODE[problem],
      message,
    })
  })
}

// Built per request: Workers only expose bindings inside the request scope. `origin` is the
// request's: the web app and the API share it, and Cloudflare only routes hostnames bound to this Worker.
export function createAuth(
  env: CloudflareBindings & EmailEnv,
  origin: string,
  database: BetterAuthOptions['database'],
  /** Moves a guest's ledger to the account the guest becomes when it signs up. */
  onGuestLink?: (fromUserId: string, toUserId: string) => Promise<void>,
) {
  const sender = emailSenderFrom(env)
  return betterAuth({
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database,
    emailAndPassword: {
      enabled: true,
      // Better Auth's default is one hour too; the number is here so the rule is visible.
      resetPasswordTokenExpiresIn: 3600,
      // Without a sender there is no email, so password reset stays off.
      ...(sender && {
        sendResetPassword: async ({ user, url }, request) => {
          const locale = resolveLocale(request?.headers.get('accept-language'))
          const message = passwordResetMessage(locale, url)
          try {
            await sender.send({
              to: user.email,
              subject: message.subject,
              text: message.text,
              html: message.html,
            })
          } catch (error) {
            // The caller must not learn whether the address exists, so a failed send is only logged.
            console.error('password reset email failed', error)
          }
        },
      }),
    },
    // The limiter only turns on when NODE_ENV is production, and a Worker never sets it:
    // without this the whole auth surface (sign-in, password reset, OAuth registration) is unthrottled.
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 300, max: 10 },
        '/request-password-reset': { window: 3600, max: 5 },
      },
    },
    advanced: {
      // Cloudflare sets the real client IP here; without it every visitor shares one bucket.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    hooks: { before: beforeEndpoint(origin) },
    // The OAuth provider issues tokens through /oauth2/token; the session JWT endpoint is not needed.
    disabledPaths: ['/token'],
    plugins: [
      jwt(),
      // A guest: a real user with no email the person owns, so the app can be explored.
      // The plugin deletes that user when the guest signs up, after moving its ledger over.
      anonymous({
        generateName: (ctx) =>
          m.guest_name({}, { locale: resolveLocale(ctx.request?.headers.get('accept-language')) }),
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await onGuestLink?.(anonymousUser.user.id, newUser.user.id)
        },
      }),
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
