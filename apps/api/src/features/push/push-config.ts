import type { VapidKeys } from '@block65/webcrypto-web-push'

/** Narrow VAPID config: the whole Worker env carries auth secrets and must not reach MCP tool context. */
export type PushConfig = VapidKeys

/** Null unless all three secrets are set, which turns push notifications off. */
export function pushConfigFrom(env: {
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
}): PushConfig | null {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = env
  if (!publicKey || !privateKey || !subject) return null
  return { subject, publicKey, privateKey }
}
