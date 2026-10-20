import * as m from '@dqfinance/i18n/messages'
import type { Locale } from '../../shared/locale.ts'

/** What the reset email carries: a subject, a plain-text body and one HTML paragraph. */
export type PasswordResetMessage = {
  subject: string
  text: string
  html: string
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes the one part of the message that comes from outside: the link. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character)
}

/**
 * The password-reset email, in the reader's language. The link is the one Better Auth built;
 * only the HTML version escapes it, the text version stays clickable as it is.
 */
export function passwordResetMessage(locale: Locale, url: string): PasswordResetMessage {
  return {
    subject: m.email_password_reset_subject({}, { locale }),
    text: m.email_password_reset_text({ url }, { locale }),
    html: `<p>${m.email_password_reset_html({ url: escapeHtml(url) }, { locale })}</p>`,
  }
}
