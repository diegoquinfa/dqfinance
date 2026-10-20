import type { Db } from './db'
import type { Auth } from './features/auth/auth'
import type { Locale } from './shared/locale'

export type AppEnv = {
  Bindings: CloudflareBindings & {
    // Web Push (VAPID) keys: secrets set with `wrangler secret put`, or .dev.vars locally.
    // Absent means push notifications are off, and the public-key route answers 503.
    VAPID_PUBLIC_KEY?: string
    VAPID_PRIVATE_KEY?: string
    VAPID_SUBJECT?: string
    // Transactional email: optional. Absent or incomplete means email is off.
    // EMAIL_PROVIDER picks one: cloudflare | resend | smtp. Without it, the first
    // complete configuration wins. EMAIL_FROM is required by every provider.
    EMAIL_PROVIDER?: string
    EMAIL_FROM?: string
    RESEND_API_KEY?: string
    CLOUDFLARE_ACCOUNT_ID?: string
    CLOUDFLARE_API_TOKEN?: string
    SMTP_HOST?: string
    SMTP_PORT?: string
    SMTP_USER?: string
    SMTP_PASSWORD?: string
    // The `send_email` binding, added in the dashboard: it is not in wrangler.jsonc.
    EMAIL?: {
      send(message: {
        to: string
        from: string
        subject: string
        text?: string
        html?: string
      }): Promise<unknown>
    }
  }
  Variables: {
    db: Db
    auth: Auth
    // From Accept-Language; used for error messages and translated names.
    locale: Locale
    // Set by requireSession; only present on session-protected routes.
    userId: string
  }
}
