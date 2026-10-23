import { publicUrl } from '../../shared/public-url.ts'
import { signatureHeader } from './webhook-signature.ts'

/** How long a webhook gets to answer before the call is a failure. */
const WEBHOOK_TIMEOUT_MS = 5000

export type Delivery = { delivered: boolean; status: number; error?: string }

/**
 * The identity of a delivery, built from the bill and the due date it announces. Two checks that
 * select the same due bill send the same id, so the receiver can drop the second copy.
 */
export const billDeliveryId = (billId: string, dueOn: string) => `${billId}:${dueOn}`

/**
 * Calls one webhook with a signed body. A hook that fails is a failure of the call, not of the
 * app: the bill is still there and the app carries on.
 *
 * The signature covers the time and the body exactly as it is sent. `X-DQFinance-Delivery` carries the delivery
 * id from `billDeliveryId`, so a receiver can drop a repeated announcement. A redirect is a
 * failure: the public-url guard checked this URL only, so following it would reach a host it never
 * saw.
 */
export async function deliverWebhook(
  hook: { url: string; secret: string },
  event: string,
  payload: unknown,
  deliveryId: string,
): Promise<Delivery> {
  const url = publicUrl(hook.url)
  if (!url) return { delivered: false, status: 0, error: 'the endpoint is not a public https URL' }
  const body = JSON.stringify(payload)
  try {
    const response = await fetch(url, {
      method: 'POST',
      // No redirect: the guard checked this URL only, so a followed hop would evade it.
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'X-DQFinance-Event': event,
        'X-DQFinance-Signature': await signatureHeader(hook.secret, body),
        'X-DQFinance-Delivery': deliveryId,
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
    if (response.status >= 300 && response.status < 400)
      return { delivered: false, status: response.status, error: `the endpoint redirected (${response.status})` }
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
