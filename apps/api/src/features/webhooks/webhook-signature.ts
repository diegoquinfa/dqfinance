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

/** The header the app sends: the algorithm and the signature. */
export const signatureHeader = async (secret: string, body: string): Promise<string> =>
  `sha256=${await signBody(secret, body)}`
