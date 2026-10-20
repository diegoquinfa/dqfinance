import type { SmtpSocket } from './smtp-client.ts'

/**
 * Production connector. `cloudflare:sockets` is imported inside the function, so `node --test`
 * never loads a module the Node runtime does not have.
 */
export async function connectSmtpSocket(options: {
  host: string
  port: number
  secureTransport: 'on' | 'off'
}): Promise<SmtpSocket> {
  // @ts-ignore - 'cloudflare:sockets' exists only in the Workers runtime, and the web app
  // compiles this file without the Workers types.
  const { connect } = await import('cloudflare:sockets')
  const socket = connect(
    { hostname: options.host, port: options.port },
    { secureTransport: options.secureTransport, allowHalfOpen: false },
  )
  return wrap(socket)
}

// @ts-ignore - the socket type comes from the Workers types, which the web app's program lacks.
function wrap(socket: Socket): SmtpSocket {
  const reader = socket.readable.getReader()
  const writer = socket.writable.getWriter()
  const decoder = new TextDecoder()
  let buffer = ''
  return {
    async readLine() {
      for (;;) {
        const index = buffer.indexOf('\n')
        if (index >= 0) {
          const line = buffer.slice(0, index)
          buffer = buffer.slice(index + 1)
          return line.endsWith('\r') ? line.slice(0, -1) : line
        }
        const { value, done } = await reader.read()
        if (done) throw new Error('smtp: the server closed the connection')
        buffer += decoder.decode(value, { stream: true })
      }
    },
    async write(data) {
      await writer.write(new TextEncoder().encode(data))
    },
    async startTls() {
      return wrap(socket.startTls())
    },
    async close() {
      await socket.close()
    },
  }
}
