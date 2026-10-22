import { sendViaSmtp, type SmtpConnector } from './smtp-client.ts'
import { connectSmtpSocket } from './smtp-sockets.ts'

/** How long a provider gets to answer before the send is a failure. */
const EMAIL_TIMEOUT_MS = 5000

export type EmailMessage = {
  to: string
  subject: string
  text: string
  html?: string
}

/** One way to send a transactional email. It throws when the provider fails. */
export type EmailSender = {
  send(message: EmailMessage): Promise<void>
}

/** The `send_email` binding, narrowed to what this feature uses. */
export type EmailBinding = {
  send(message: { to: string; from: string; subject: string; text?: string; html?: string }): Promise<unknown>
}

/** The secrets this feature reads. All of them are optional. */
export type EmailEnv = {
  EMAIL_PROVIDER?: string
  EMAIL_FROM?: string
  RESEND_API_KEY?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_TOKEN?: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASSWORD?: string
  EMAIL?: EmailBinding
}

const SECRET_KEYS = [
  'EMAIL_FROM',
  'EMAIL_PROVIDER',
  'RESEND_API_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
] as const

/** A whitespace-only secret is an absent secret. */
function trimmedEnv(env: EmailEnv): EmailEnv {
  const trimmed: EmailEnv = { ...env }
  for (const key of SECRET_KEYS) {
    const value = trimmed[key]
    if (typeof value === 'string') trimmed[key] = value.trim()
  }
  return trimmed
}

/**
 * Picks the provider and returns a sender, or null when email is off. A missing secret never
 * throws: an incomplete provider simply means no email.
 */
export function emailSenderFrom(env: EmailEnv, connect: SmtpConnector = connectSmtpSocket): EmailSender | null {
  const config = trimmedEnv(env)
  const from = config.EMAIL_FROM
  if (!from) return null
  const provider = config.EMAIL_PROVIDER?.toLowerCase()
  if (provider) {
    if (provider === 'cloudflare') return cloudflareSender(config, from)
    if (provider === 'resend') return resendSender(config, from)
    if (provider === 'smtp') return smtpSender(config, from, connect)
    return null
  }
  // No explicit provider: the first complete configuration wins. The binding is last: it is
  // declared in wrangler.jsonc, so it exists in every deployment and must not shadow a provider
  // someone configured on purpose.
  if (config.RESEND_API_KEY) return resendSender(config, from)
  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASSWORD) return smtpSender(config, from, connect)
  if (config.CLOUDFLARE_ACCOUNT_ID && config.CLOUDFLARE_API_TOKEN) return cloudflareRestSender(config, from)
  const binding = config.EMAIL
  if (binding?.send) return cloudflareBindingSender(binding, from)
  return null
}

/** An explicit `cloudflare` provider: the binding when it exists, the REST API otherwise. */
function cloudflareSender(env: EmailEnv, from: string): EmailSender | null {
  const binding = env.EMAIL
  if (binding?.send) return cloudflareBindingSender(binding, from)
  return cloudflareRestSender(env, from)
}

function cloudflareBindingSender(binding: EmailBinding, from: string): EmailSender {
  return {
    send: async (message) => {
      await binding.send({
        to: message.to,
        from,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
    },
  }
}

function cloudflareRestSender(env: EmailEnv, from: string): EmailSender | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID
  const token = env.CLOUDFLARE_API_TOKEN
  if (!accountId || !token) return null
  return {
    send: async (message) => {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
        {
          method: 'POST',
          // A provider that never answers must not hold the request open.
          signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: message.to,
            from,
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
        },
      )
      if (!response.ok) throw new Error(`cloudflare email failed: ${response.status}`)
      const result = (await response.json().catch(() => null)) as { success?: boolean } | null
      if (result?.success === false) throw new Error('cloudflare email failed')
    },
  }
}

function resendSender(env: EmailEnv, from: string): EmailSender | null {
  const key = env.RESEND_API_KEY
  if (!key) return null
  return {
    send: async (message) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        // A provider that never answers must not hold the request open.
        signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      })
      if (!response.ok) throw new Error(`resend email failed: ${response.status}`)
    },
  }
}

function smtpSender(env: EmailEnv, from: string, connect: SmtpConnector): EmailSender | null {
  const host = env.SMTP_HOST
  const user = env.SMTP_USER
  const password = env.SMTP_PASSWORD
  if (!host || !user || !password) return null
  const port = Number(env.SMTP_PORT) || 465
  return {
    send: async (message) => {
      await sendViaSmtp(
        {
          host,
          port,
          user,
          password,
          from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        },
        connect,
      )
    },
  }
}
