/**
 * A Web Push endpoint is a public https URL. The Worker fetches it, so an endpoint on a
 * loopback, private or link-local address would let an account make the server call inside
 * its own network, and plain http would send the payload in the clear.
 */

/** The IPv4 ranges a request must never reach: loopback, private, link-local and CGNAT. */
const PRIVATE_IPV4 = [
  /^0\./, // 0.0.0.0/8
  /^10\./, // 10/8
  /^127\./, // 127/8
  /^169\.254\./, // 169.254/16
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16/12
  /^192\.168\./, // 192.168/16
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64/10
]

/** The IPv6 ranges a request must never reach: unspecified, loopback, unique local and link-local. */
const isPrivateIpv6 = (address: string) => {
  const value = address.toLowerCase()
  if (value === '::' || value === '::1') return true
  if (/^f[cd][0-9a-f]{0,2}:/.test(value)) return true // fc00::/7
  if (/^fe[89ab][0-9a-f]?:/.test(value)) return true // fe80::/10
  // An IPv4-mapped address is as private as the IPv4 it carries (::ffff:127.0.0.1).
  const mapped = value.match(/(\d{1,3}(\.\d{1,3}){3})$/)?.[1]
  return mapped ? PRIVATE_IPV4.some((pattern) => pattern.test(mapped)) : false
}

const isIpv4 = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host)

/** True when the host names a public endpoint: not an IP literal in a private range, not a local name. */
export const publicHost = (host: string): boolean => {
  const name = host.trim().toLowerCase().replace(/\.$/, '')
  if (!name) return false
  if (name.startsWith('[') && name.endsWith(']')) return !isPrivateIpv6(name.slice(1, -1))
  if (isIpv4(name)) return !PRIVATE_IPV4.some((pattern) => pattern.test(name))
  if (name.includes(':')) return !isPrivateIpv6(name)
  if (name === 'localhost' || name.endsWith('.localhost')) return false
  if (name.endsWith('.local') || name.endsWith('.internal')) return false
  return true
}

/**
 * The endpoint as a URL, or null when it is not a public https URL.
 * The same check guards the write and the send, so a row that no longer passes is skipped.
 */
export const pushEndpointUrl = (value: string): URL | null => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (!publicHost(url.hostname)) return null
  return url
}
