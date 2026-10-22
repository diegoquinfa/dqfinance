/**
 * A URL the Worker fetches on the user's behalf is a public https URL. One on a loopback, private
 * or link-local address would let an account make the server call inside its own network, and
 * plain http would send the payload in the clear.
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

/** The 16 bytes of an IPv6 literal, or null when it does not parse. */
const ipv6Bytes = (address: string): number[] | null => {
  const [head, tail, extra] = address.split('::')
  if (extra !== undefined) return null
  const groups = (part: string | undefined): number[] => {
    if (!part) return []
    return part.split(':').flatMap((group) => {
      const octets = group.split('.').map(Number)
      if (octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)) {
        return [(octets[0]! << 8) | octets[1]!, (octets[2]! << 8) | octets[3]!]
      }
      return group.includes('.') ? [Number.NaN] : [Number.parseInt(group, 16)]
    })
  }
  const headWords = groups(head)
  const tailWords = groups(tail)
  const zeros = 8 - headWords.length - tailWords.length
  if (tail === undefined ? headWords.length !== 8 : zeros < 0) return null
  const words = [...headWords, ...Array<number>(tail === undefined ? 0 : zeros).fill(0), ...tailWords]
  if (!words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff)) return null
  return words.flatMap((word) => [word >> 8, word & 0xff])
}

/**
 * The IPv6 ranges a request must never reach: unspecified, loopback, unique local, link-local,
 * IPv4-mapped, NAT64 and 6to4 that carries a private IPv4.
 */
const isPrivateIpv6 = (address: string) => {
  const bytes = ipv6Bytes(address)
  if (!bytes) return false
  const startsWith = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte)
  const privateEmbedded = (embedded: number[]) => PRIVATE_IPV4.some((pattern) => pattern.test(embedded.join('.')))
  if (bytes.every((byte) => byte === 0)) return true // ::
  if (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1) return true // ::1
  if ((bytes[0]! & 0xfe) === 0xfc) return true // fc00::/7
  if (bytes[0] === 0xfe && (bytes[1]! & 0xc0) === 0x80) return true // fe80::/10
  if (bytes.slice(0, 12).every((byte) => byte === 0)) return privateEmbedded(bytes.slice(-4)) // ::/96 (IPv4-compatible)
  if (startsWith(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff)) return privateEmbedded(bytes.slice(-4)) // ::ffff:aaaa:bbbb (IPv4-mapped)
  if (startsWith(0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 0, 0)) return privateEmbedded(bytes.slice(-4)) // ::ffff:0:aaaa:bbbb (IPv4-translated)
  if (startsWith(0, 0x64, 0xff, 0x9b)) {
    const nat64 = bytes.slice(4, 12).every((byte) => byte === 0) || (bytes[4] === 0 && bytes[5] === 1) // 64:ff9b::/96 or 64:ff9b:1::/48
    // A NAT64 address is as private as the IPv4 it carries in its last four bytes.
    if (nat64) return privateEmbedded(bytes.slice(-4))
  }
  if (startsWith(0x20, 0x02)) return privateEmbedded(bytes.slice(2, 6)) // 2002::/16 carries its IPv4 at bytes 2-5
  return false
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
 * The URL as a URL, or null when it is not a public https URL.
 * The same check guards the write and the send, so a row that no longer passes is skipped.
 */
export const publicUrl = (value: string): URL | null => {
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
