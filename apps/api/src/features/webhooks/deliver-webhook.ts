import { publicUrl } from '../../shared/public-url'
import { signatureHeader } from './webhook-signature'

/** How long a webhook gets to answer before the call is a failure. */
const WEBHOOK_TIMEOUT_MS = 5000

export type Delivery = { delivered: boolean; status: number; error?: string }

/**
 * Calls one webhook with a signed body. A hook that fails is a failure of the call, not of the
 * app: the bill is still there and the app carries on.
 */
export async function deliverWebhook(
  hook: { url: string; secret: string },
  event: string,
  payload: unknown,
): Promise<Delivery> {
  const url = publicUrl(hook.url)
  if (!url) return { delivered: false, status: 0, error: 'the endpoint is not a public https URL' }
  const body = JSON.stringify(payload)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DQFinance-Event': event,
        'X-DQFinance-Signature': await signatureHeader(hook.secret, body),
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
    return response.ok
      ? { delivered: true, status: response.status }
      : { delivered: false, status: response.status, error: `the endpoint answered ${response.status}` }
  } catch (error) {
    return {
      delivered: false,
      status: 0,
      error: error instanceof Error ? error.message : 'the call failed',
    }
  }
}
