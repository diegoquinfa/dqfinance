import type { Db } from './db'
import type { Auth } from './features/auth/auth'
import type { Locale } from './shared/locale'

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: {
    db: Db
    auth: Auth
    // From Accept-Language; used for error messages and translated names.
    locale: Locale
    // Set by requireSession; only present on session-protected routes.
    userId: string
  }
}
