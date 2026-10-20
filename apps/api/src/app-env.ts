import type { Db } from './db'
import type { Auth } from './features/auth/auth'
import type { EmailEnv } from './features/email/email-sender.ts'
import type { Locale } from './shared/locale'

export type AppEnv = {
  Bindings: CloudflareBindings & {
    // Web Push (VAPID) keys: secrets set with `wrangler secret put`, or .dev.vars locally.
    // Absent means push notifications are off, and the public-key route answers 503.
    VAPID_PUBLIC_KEY?: string
    VAPID_PRIVATE_KEY?: string
    VAPID_SUBJECT?: string
    // Transactional email: optional. Absent or incomplete means email is off; EMAIL_PROVIDER
    // picks one provider when it is set. See features/email/email-sender.ts.
  } & EmailEnv
  Variables: {
    db: Db
    auth: Auth
    // From Accept-Language; used for error messages and translated names.
    locale: Locale
    // Set by requireSession; only present on session-protected routes.
    userId: string
  }
}
