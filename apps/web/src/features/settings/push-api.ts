import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api, unwrap } from '#/shared/api'
import { m } from '#/shared/i18n'

/** What a recorded expense changes. Balances are computed, so nothing is patched into the cache. */
const FINANCE_QUERY_KEYS = ['transactions', 'balances', 'transfers', 'recurring-expenses'] as const

/** Standard base64 (what `atob` reads) to the base64url the server and Web Push speak. */
function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

/** The server's VAPID key is base64url; `applicationServerKey` wants bytes. */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  // atob rejects a VAPID key that omitted its padding.
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new Uint8Array([...binary].map((character) => character.charCodeAt(0)))
}

function subscriptionKeys(subscription: PushSubscription) {
  const p256dh = subscription.getKey('p256dh')
  const auth = subscription.getKey('auth')
  if (!p256dh || !auth) throw new Error(m.error_generic())
  return { p256dh: toBase64Url(new Uint8Array(p256dh)), auth: toBase64Url(new Uint8Array(auth)) }
}

async function saveSubscription(subscription: PushSubscription) {
  const { p256dh, auth } = subscriptionKeys(subscription)
  await unwrap(api.api['push-subscriptions'].$put({ json: { endpoint: subscription.endpoint, p256dh, auth } }))
}

/** Registers the worker, subscribes with the server's VAPID key, and stores the subscription. */
export async function enablePush() {
  const { publicKey } = await unwrap(api.api['push-subscriptions']['vapid-public-key'].$get())
  const registration = await navigator.serviceWorker.register('/push-sw.js')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: fromBase64Url(publicKey),
  })
  await saveSubscription(subscription)
}

/** Turns push off in this browser and forgets the endpoint server-wide. */
export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  const { endpoint } = subscription
  await subscription.unsubscribe()
  await unwrap(api.api['push-subscriptions'].$delete({ json: { endpoint } }))
}

function currentSubscription() {
  return navigator.serviceWorker.getRegistration().then((registration) => registration?.pushManager.getSubscription())
}

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const hasPushSubscription = async () => Boolean(await currentSubscription())

/**
 * Signed-in shell: refresh the stored subscription the browser already allowed, and refresh the
 * finance queries when a push reaches this tab. Permission is asked for on the settings page only.
 */
export function usePushUpdates(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !pushSupported()) return

    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type !== 'finance-changed') return
      for (const key of FINANCE_QUERY_KEYS) void queryClient.invalidateQueries({ queryKey: [key] })
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // A failed refresh is nothing to show: the next page load retries it.
    if (Notification.permission === 'granted') void enablePush().catch(() => {})

    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [enabled, queryClient])
}
