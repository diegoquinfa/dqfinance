/** A line-oriented socket, so the SMTP client is testable without `cloudflare:sockets`. */
export type SmtpSocket = {
  /** Next line of text, without the trailing CRLF. */
  readLine(): Promise<string>
  write(data: string): Promise<void>
  /** TLS upgrade after STARTTLS; null when the connector cannot upgrade the socket. */
  startTls?(): Promise<SmtpSocket | null>
  close?(): Promise<void>
}

export type SmtpConnector = (options: {
  host: string
  port: number
  secureTransport: 'on' | 'off'
}) => Promise<SmtpSocket>

export type SmtpMessage = {
  host: string
  port: number
  user: string
  password: string
  /** Display form, `Name <address>` or a bare address. */
  from: string
  to: string
  subject: string
  text: string
  html?: string
}

/** Sends one message over SMTP. Throws when the server refuses any step. */
export async function sendViaSmtp(message: SmtpMessage, connect: SmtpConnector): Promise<void> {
  const implicitTls = message.port === 465
  let socket = await connect({
    host: message.host,
    port: message.port,
    secureTransport: implicitTls ? 'on' : 'off',
  })
  try {
    await expect(await readReply(socket), 220, 'greeting')
    await expect(await command(socket, 'EHLO dqfinance'), 250, 'EHLO')
    if (!implicitTls) {
      await expect(await command(socket, 'STARTTLS'), 220, 'STARTTLS')
      const upgraded = await socket.startTls?.()
      if (!upgraded) throw new Error('smtp: the connector cannot upgrade the socket to TLS')
      socket = upgraded
      await expect(await command(socket, 'EHLO dqfinance'), 250, 'EHLO')
    }
    await expect(
      await command(socket, `AUTH PLAIN ${base64Utf8(`\0${message.user}\0${message.password}`)}`),
      235,
      'AUTH',
    )
    await expect(await command(socket, `MAIL FROM:<${address(message.from)}>`), [250, 251, 252], 'MAIL FROM')
    await expect(await command(socket, `RCPT TO:<${address(message.to)}>`), [250, 251, 252], 'RCPT TO')
    await expect(await command(socket, 'DATA'), 354, 'DATA')
    await socket.write(`${dotStuff(payload(message))}\r\n.\r\n`)
    await expect(await readReply(socket), 250, 'message')
    // The mail is already accepted; a server that hangs up on QUIT does not fail the send.
    await command(socket, 'QUIT').catch(() => null)
  } finally {
    await socket.close?.()
  }
}

async function command(socket: SmtpSocket, line: string): Promise<number> {
  await socket.write(`${line}\r\n`)
  return readReply(socket)
}

async function readReply(socket: SmtpSocket): Promise<number> {
  for (;;) {
    const line = await socket.readLine()
    const match = /^(\d{3})([ -])?/.exec(line)
    if (!match) throw new Error(`smtp: unreadable reply: ${line}`)
    if (match[2] !== '-') return Number(match[1])
  }
}

async function expect(code: number, wanted: number | number[], step: string): Promise<void> {
  const codes = Array.isArray(wanted) ? wanted : [wanted]
  if (!codes.includes(code)) throw new Error(`smtp: ${step} failed with ${code}`)
}

function payload(message: SmtpMessage): string {
  const headers = [
    `From: ${fromHeader(message.from)}`,
    `To: ${header(message.to)}`,
    `Subject: ${encodedHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
  ]
  const text = crlf(message.text)
  if (message.html) {
    const boundary = `----dqfinance-${crypto.randomUUID()}`
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      crlf(message.html),
      `--${boundary}--`,
    ].join('\r\n')
    return `${headers.join('\r\n')}\r\n\r\n${body}`
  }
  headers.push('Content-Type: text/plain; charset=utf-8')
  return `${headers.join('\r\n')}\r\n\r\n${text}`
}

function crlf(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')
}

/** Header values must not carry line breaks of their own. */
function header(value: string): string {
  return value.replace(/[\r\n]+/g, ' ')
}

/** RFC 2047 encoded word for a header value that carries non-ASCII bytes. */
function encodedHeader(value: string): string {
  const safe = header(value)
  return /[^\x00-\x7F]/.test(safe) ? `=?UTF-8?B?${base64Utf8(safe)}?=` : safe
}

/** `Name <address>` keeps the address plain and encodes a non-ASCII display name. */
function fromHeader(value: string): string {
  const safe = header(value)
  const match = /^(.*?)<([^>]*)>$/.exec(safe)
  if (!match) return safe
  const name = (match[1] ?? '').trim()
  const mailbox = (match[2] ?? '').trim()
  if (!name) return mailbox
  const encoded = /[^\x00-\x7F]/.test(name) ? `=?UTF-8?B?${base64Utf8(name)}?=` : name
  return `${encoded} <${mailbox}>`
}

/** Base64 of the UTF-8 bytes; `btoa` alone throws above U+00FF. */
function base64Utf8(value: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** `Name <address>` becomes `address`; a bare address stays as it is. */
function address(value: string): string {
  const match = /<([^>]*)>/.exec(value)
  return (match?.[1] ?? value).trim()
}

/** RFC 5321 transparency: a line that starts with a dot gets one more. */
function dotStuff(body: string): string {
  return body
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n')
}
