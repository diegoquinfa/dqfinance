/**
 * The signature of a body: an HMAC-SHA256 over the exact bytes the app sends, so the receiver can
 * check that the call came from the app and that nobody changed it on the way.
 */
export const signBody = async (secret: string, body: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * The header the app sends: the time of the call, and the signature over that time and the body.
 * The time is inside the signed bytes, so a captured call cannot be replayed with a fresh time; a
 * receiver refuses a call whose time is more than five minutes old.
 */
export const signatureHeader = async (
  secret: string,
  body: string,
  time = Math.floor(Date.now() / 1000),
): Promise<string> => `t=${time},v1=${await signBody(secret, `${time}.${body}`)}`
