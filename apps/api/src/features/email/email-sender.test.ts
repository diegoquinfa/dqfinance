import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emailSenderFrom, type EmailBinding } from './email-sender.ts'
import type { SmtpSocket } from './smtp-client.ts'

type FetchCall = { url: string; init: RequestInit }

function fakeFetch() {
  const calls: FetchCall[] = []
  const original = globalThis.fetch
  return {
    calls,
    install(response: (call: FetchCall) => Response) {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const call = { url: String(input), init: init ?? {} }
        calls.push(call)
        return response(call)
      }) as typeof fetch
    },
    restore() {
      globalThis.fetch = original
    },
  }
}

class ScriptedSocket implements SmtpSocket {
  written: string[] = []
  startTls?: () => Promise<SmtpSocket | null>
  private replies: string[]
  constructor(replies: string[]) {
    this.replies = [...replies]
  }
  async readLine(): Promise<string> {
    const line = this.replies.shift()
    if (line === undefined) throw new Error('the script ran out of replies')
    return line
  }
  async write(data: string): Promise<void> {
    this.written.push(data)
  }
}

const smtpEnv = {
  EMAIL_FROM: 'DQ <dq@example.com>',
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'user',
  SMTP_PASSWORD: 'pass',
}

/** A full, successful SMTP conversation. `ScriptedSocket` copies it. */
const smtpReplies = [
  '220 ready',
  '250 hello',
  '235 authenticated',
  '250 sender ok',
  '250 recipient ok',
  '354 go ahead',
  '250 queued',
  '221 bye',
]

test('no secrets means no sender', () => {
  assert.equal(emailSenderFrom({}), null)
})

test('an explicit provider with missing secrets turns email off', () => {
  assert.equal(emailSenderFrom({ EMAIL_PROVIDER: 'resend', EMAIL_FROM: 'a@b.c' }), null)
  assert.equal(emailSenderFrom({ EMAIL_PROVIDER: 'smtp', EMAIL_FROM: 'a@b.c', SMTP_HOST: 'h' }), null)
  assert.equal(emailSenderFrom({ EMAIL_PROVIDER: 'cloudflare', EMAIL_FROM: 'a@b.c' }), null)
})

test('EMAIL_FROM is required for every provider', () => {
  assert.equal(emailSenderFrom({ RESEND_API_KEY: 'key' }), null)
  assert.equal(emailSenderFrom({ ...smtpEnv, EMAIL_FROM: undefined }), null)
  assert.equal(emailSenderFrom({ CLOUDFLARE_ACCOUNT_ID: 'id', CLOUDFLARE_API_TOKEN: 'token' }), null)
})

test('the binding beats a resend key', async () => {
  const sent: string[] = []
  const binding: EmailBinding = {
    send: async (message) => {
      sent.push(`${message.from} -> ${message.to}`)
    },
  }
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{}', { status: 200 }))
  try {
    const sender = emailSenderFrom({ EMAIL_FROM: 'a@b.c', RESEND_API_KEY: 'key', EMAIL: binding })
    assert.ok(sender)
    await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  } finally {
    fetcher.restore()
  }
  assert.deepEqual(sent, ['a@b.c -> to@example.com'])
  assert.equal(fetcher.calls.length, 0)
})

test('a resend key beats smtp', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{}', { status: 200 }))
  let connected = false
  try {
    const sender = emailSenderFrom(
      { ...smtpEnv, RESEND_API_KEY: 'key' },
      async () => {
        connected = true
        return new ScriptedSocket([])
      },
    )
    assert.ok(sender)
    await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  } finally {
    fetcher.restore()
  }
  assert.equal(connected, false)
  assert.equal(fetcher.calls[0]?.url, 'https://api.resend.com/emails')
})

test('smtp beats the cloudflare rest token', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{}', { status: 200 }))
  const socket = new ScriptedSocket([
    '220 ready',
    '250 hello',
    '235 authenticated',
    '250 sender ok',
    '250 recipient ok',
    '354 go ahead',
    '250 queued',
    '221 bye',
  ])
  try {
    const sender = emailSenderFrom(
      { ...smtpEnv, CLOUDFLARE_ACCOUNT_ID: 'id', CLOUDFLARE_API_TOKEN: 'token' },
      async () => socket,
    )
    assert.ok(sender)
    await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  } finally {
    fetcher.restore()
  }
  assert.equal(fetcher.calls.length, 0)
  assert.match(socket.written.join(''), /RCPT TO:<to@example\.com>/)
})

test('resend posts the message with a bearer token', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{"id":"1"}', { status: 200 }))
  try {
    const sender = emailSenderFrom({ EMAIL_FROM: 'DQ <dq@example.com>', RESEND_API_KEY: 're_key' })
    assert.ok(sender)
    await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body', html: '<p>body</p>' })
  } finally {
    fetcher.restore()
  }
  const call = fetcher.calls[0]
  assert.ok(call)
  assert.equal(call.url, 'https://api.resend.com/emails')
  assert.equal((call.init.headers as Record<string, string>).Authorization, 'Bearer re_key')
  assert.deepEqual(JSON.parse(String(call.init.body)), {
    from: 'DQ <dq@example.com>',
    to: 'to@example.com',
    subject: 'Hi',
    html: '<p>body</p>',
    text: 'body',
  })
})

test('the cloudflare rest api posts the message with a bearer token', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{"success":true}', { status: 200 }))
  try {
    const sender = emailSenderFrom({
      EMAIL_FROM: 'DQ <dq@example.com>',
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      CLOUDFLARE_API_TOKEN: 'cf_token',
    })
    assert.ok(sender)
    await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body', html: '<p>body</p>' })
  } finally {
    fetcher.restore()
  }
  const call = fetcher.calls[0]
  assert.ok(call)
  assert.equal(call.url, 'https://api.cloudflare.com/client/v4/accounts/account-id/email/sending/send')
  assert.equal((call.init.headers as Record<string, string>).Authorization, 'Bearer cf_token')
  assert.deepEqual(JSON.parse(String(call.init.body)), {
    to: 'to@example.com',
    from: 'DQ <dq@example.com>',
    subject: 'Hi',
    text: 'body',
    html: '<p>body</p>',
  })
})

test('a provider that answers with an error fails the send', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('nope', { status: 500 }))
  try {
    const sender = emailSenderFrom({ EMAIL_FROM: 'a@b.c', RESEND_API_KEY: 'key' })
    assert.ok(sender)
    await assert.rejects(() => sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' }))
  } finally {
    fetcher.restore()
  }
})

test('a cloudflare rest answer without success fails the send', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{"success":false,"errors":[]}', { status: 200 }))
  try {
    const sender = emailSenderFrom({
      EMAIL_FROM: 'a@b.c',
      CLOUDFLARE_ACCOUNT_ID: 'id',
      CLOUDFLARE_API_TOKEN: 'token',
    })
    assert.ok(sender)
    await assert.rejects(() => sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' }))
  } finally {
    fetcher.restore()
  }
})

test('smtp walks the conversation and dot-stuffs the body', async () => {
  const socket = new ScriptedSocket([
    '220 smtp ready',
    '250-mail.example.com',
    '250 HELP',
    '235 authenticated',
    '250 sender ok',
    '250 recipient ok',
    '354 go ahead',
    '250 queued',
    '221 bye',
  ])
  const sender = emailSenderFrom({ ...smtpEnv, EMAIL_PROVIDER: 'smtp' }, async () => socket)
  assert.ok(sender)
  await sender.send({ to: 'to@example.com', subject: 'Reset', text: 'line one\n.hidden' })
  const script = socket.written.join('')
  assert.ok(script.includes('EHLO dqfinance\r\n'))
  assert.ok(script.includes(`AUTH PLAIN ${btoa('\0user\0pass')}\r\n`))
  assert.ok(script.includes('MAIL FROM:<dq@example.com>\r\n'))
  assert.ok(script.includes('RCPT TO:<to@example.com>\r\n'))
  assert.ok(script.includes('DATA\r\n'))
  assert.ok(script.includes('Subject: Reset\r\n'))
  assert.ok(script.includes('\r\n..hidden\r\n'))
  assert.ok(script.includes('QUIT\r\n'))
})

test('smtp fails when the server refuses a step', async () => {
  const socket = new ScriptedSocket(['220 smtp ready', '250 hello', '550 no such user'])
  const sender = emailSenderFrom({ ...smtpEnv, EMAIL_PROVIDER: 'smtp' }, async () => socket)
  assert.ok(sender)
  await assert.rejects(() => sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' }), /smtp/)
})

test('port 587 upgrades the socket before authenticating', async () => {
  const upgraded = new ScriptedSocket([
    '250 hello',
    '235 authenticated',
    '250 sender ok',
    '250 recipient ok',
    '354 go ahead',
    '250 queued',
    '221 bye',
  ])
  const plain = new ScriptedSocket(['220 smtp ready', '250 hello', '220 go ahead'])
  plain.startTls = async () => upgraded
  const sender = emailSenderFrom({ ...smtpEnv, EMAIL_PROVIDER: 'smtp', SMTP_PORT: '587' }, async () => plain)
  assert.ok(sender)
  await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  assert.ok(plain.written.join('').includes('STARTTLS\r\n'))
  assert.ok(upgraded.written.join('').includes('AUTH PLAIN '))
})

test('smtp accepts 251 and 252 for mail from and rcpt to', async () => {
  const socket = new ScriptedSocket([
    '220 ready',
    '250 hello',
    '235 authenticated',
    '251 sender will forward',
    '252 recipient will forward',
    '354 go ahead',
    '250 queued',
    '221 bye',
  ])
  const sender = emailSenderFrom({ ...smtpEnv, EMAIL_PROVIDER: 'smtp' }, async () => socket)
  assert.ok(sender)
  await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  assert.ok(socket.written.join('').includes('RCPT TO:<to@example.com>'))
})

test('smtp still fails on a 2xx reply that is not a success', async () => {
  const socket = new ScriptedSocket(['220 ready', '250 hello', '235 authenticated', '253 sender ok'])
  const sender = emailSenderFrom({ ...smtpEnv, EMAIL_PROVIDER: 'smtp' }, async () => socket)
  assert.ok(sender)
  await assert.rejects(() => sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' }), /smtp/)
})

test('auth plain encodes the password as utf-8', async () => {
  const socket = new ScriptedSocket(smtpReplies)
  const sender = emailSenderFrom(
    { ...smtpEnv, EMAIL_PROVIDER: 'smtp', SMTP_PASSWORD: 'contraseña' },
    async () => socket,
  )
  assert.ok(sender)
  await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  const expected = Buffer.from('\0user\0contraseña', 'utf8').toString('base64')
  assert.ok(socket.written.join('').includes(`AUTH PLAIN ${expected}\r\n`))
})

test('a whitespace resend key does not shadow a complete smtp config', async () => {
  const fetcher = fakeFetch()
  fetcher.install(() => new Response('{}', { status: 200 }))
  const socket = new ScriptedSocket(smtpReplies)
  try {
    const sender = emailSenderFrom({ ...smtpEnv, RESEND_API_KEY: '   ' }, async () => socket)
    assert.ok(sender)
    await sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' })
  } finally {
    fetcher.restore()
  }
  assert.equal(fetcher.calls.length, 0)
  assert.ok(socket.written.join('').includes('MAIL FROM:<dq@example.com>'))
})

test('smtp encodes non-ascii headers as rfc 2047 words', async () => {
  const socket = new ScriptedSocket(smtpReplies)
  const sender = emailSenderFrom(
    { ...smtpEnv, EMAIL_PROVIDER: 'smtp', EMAIL_FROM: 'Ñandú <dq@example.com>' },
    async () => socket,
  )
  assert.ok(sender)
  await sender.send({ to: 'to@example.com', subject: 'Restablece tu contraseña', text: 'body' })
  const script = socket.written.join('')
  const headers = script.slice(0, script.indexOf('\r\n\r\n'))
  assert.ok(!/[^\x00-\x7F]/.test(headers))
  const subject = /^Subject: (.*)$/m.exec(headers)?.[1]
  assert.ok(subject)
  assert.match(subject, /^=\?UTF-8\?B\?/)
  assert.equal(decodeWord(subject), 'Restablece tu contraseña')
  assert.equal(/^From: (.*)$/m.exec(headers)?.[1], `=?UTF-8?B?${Buffer.from('Ñandú', 'utf8').toString('base64')}?= <dq@example.com>`)
})

/** Reads back an RFC 2047 base64 encoded word. */
function decodeWord(word: string): string {
  const encoded = /^=\?UTF-8\?B\?(.*)\?=$/.exec(word)?.[1]
  assert.ok(encoded)
  return Buffer.from(encoded, 'base64').toString('utf8')
}

test('port 587 fails when the connector cannot upgrade the socket', async () => {
  const plain = new ScriptedSocket(['220 smtp ready', '250 hello', '220 go ahead'])
  const sender = emailSenderFrom({ ...smtpEnv, EMAIL_PROVIDER: 'smtp', SMTP_PORT: '587' }, async () => plain)
  assert.ok(sender)
  await assert.rejects(() => sender.send({ to: 'to@example.com', subject: 'Hi', text: 'body' }), /upgrade/)
})
