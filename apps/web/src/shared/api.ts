import type { AppType } from '@dqfinance/api/app-type'
import { hc } from 'hono/client'
import { API_URL } from './config'
import { currentLocale, m } from './i18n'

/** One client for the whole app: cookies for the session, and the locale for translated responses. */
export const api = hc<AppType>(API_URL, {
  init: { credentials: 'include' },
  headers: () => ({ 'accept-language': currentLocale() }),
})

/** A failure the API reported. `code` is stable for logic; `message` is already translated. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

type JsonResponse<T> = { ok: boolean; status: number; json(): Promise<T> }

/**
 * Awaits an API call and returns its body, turning failures into ApiError with the API's
 * translated message. Network failures (API down, timeout) become a reachability message.
 */
export async function unwrap<T>(call: Promise<JsonResponse<T>>): Promise<T> {
  let response: JsonResponse<T>
  try {
    response = await call
  } catch {
    throw new ApiError('network', m.error_network({ url: API_URL }, { locale: currentLocale() }), 0)
  }
  if (response.ok) return response.json()
  const body = await response.json().catch(() => null)
  const { code, message } = (body ?? {}) as { code?: string; message?: string }
  throw new ApiError(
    code ?? 'internal',
    message ?? m.error_generic(undefined, { locale: currentLocale() }),
    response.status,
  )
}
