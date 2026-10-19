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
type BlobResponse = { ok: boolean; status: number; blob(): Promise<Blob> }

/** The API's `{ code, message }` failure, or the generic message when the body is not one. */
async function apiFailure(response: { status: number; json?(): Promise<unknown> }) {
  const body = await response.json?.().catch(() => null)
  const { code, message } = (body ?? {}) as { code?: string; message?: string }
  return new ApiError(code ?? 'internal', message ?? m.error_generic(undefined, { locale: currentLocale() }), response.status)
}

const networkError = () => new ApiError('network', m.error_network({ url: API_URL }, { locale: currentLocale() }), 0)

/**
 * Awaits an API call and returns its body, turning failures into ApiError with the API's
 * translated message. Network failures (API down, timeout) become a reachability message.
 */
export async function unwrap<T>(call: Promise<JsonResponse<T>>): Promise<T> {
  let response: JsonResponse<T>
  try {
    response = await call
  } catch {
    throw networkError()
  }
  if (!response.ok) throw await apiFailure(response)
  return response.json()
}

/** The file body of a download (`GET /api/documents/:id`), with the same failures as `unwrap`. */
export async function unwrapBlob(call: Promise<BlobResponse>): Promise<Blob> {
  let response: BlobResponse
  try {
    response = await call
  } catch {
    throw networkError()
  }
  if (!response.ok) throw await apiFailure(response)
  return response.blob()
}
