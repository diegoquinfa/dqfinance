# Transactional email

Forgot-password is the email that matters. Sign-up gets its own page and a repeated password. A deployment with no provider keeps working.

## Provider

One sender, picked at request time from secrets. Nothing is required.

| Provider | When it is selected | How it sends |
| --- | --- | --- |
| Resend | `RESEND_API_KEY`, provider `resend` or no earlier match | `POST https://api.resend.com/emails` |
| SMTP | `SMTP_HOST` + user + password + `EMAIL_FROM`, provider `smtp` or no earlier match | `cloudflare:sockets`. Port 465 implicit TLS. Port 587 STARTTLS. AUTH PLAIN |
| Cloudflare REST | account id + API token, provider `cloudflare` or no earlier match | `POST /client/v4/accounts/{account_id}/email/sending/send` ([REST](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/), 2026-10-15) |
| Cloudflare binding | `env.EMAIL.send` exists, provider `cloudflare` or no earlier match | Workers Email Service `send()` ([Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), updated 2026-10-15) |

`EMAIL_FROM` is required for all of them. The `send_email` binding is declared in `wrangler.jsonc` (as `EMAIL`), so a deploy cannot drop it. That file is shared by every deployment, so the binding exists everywhere: it is the fallback with the lowest priority, and a Resend key, an SMTP config or a Cloudflare REST token all win over it. Without `EMAIL_FROM` email is off even with the binding. The sender domain must be onboarded under *Email Service → Email Sending*.

Cloudflare Email Service (docs 2026-10-15) can send to any recipient only after a domain is onboarded. Before that, only verified destination addresses work. SMTP on Cloudflare's own host (`smtp.mx.cloudflare.net:465`, user `api_token`) is just the SMTP provider pointed at that host; we do not special-case it.

If the chosen provider is incomplete, email is off. The app does not throw at boot.

## What is sent

Only the password-reset message. Better Auth `sendResetPassword` gets `{ user, url, token }`. The callback awaits the send. If the installed helper does not use `waitUntil`, the callback must still be awaited so the isolate does not drop the fetch. Token lifetime: 1 hour.

The message is plain text plus one HTML paragraph, both from `@dqfinance/i18n`, locale from `Accept-Language`. The link is the `url` Better Auth built from the request origin.

Unknown addresses get the same HTTP response and the same page copy as known ones. No verification email: requiring it would lock accounts created before this change.

## Web

- `/sign-in` is sign-in only. Link to `/sign-up`. Forgot-password link only when `GET /api/auth-config` reports `passwordReset`; otherwise no link.
- `/sign-up` collects name, email, password, confirm password.
- `/forgot-password` and `/reset-password` follow the sign-in route (`ssr: false`).
- Settings change-password also repeats the new password.

Client and server both reject a missing or different confirm, and a password shorter than 8 characters. The server hook runs on sign-up and change-password so a client that skips the field still fails.

## Not done, on purpose

In-memory rate limit (per isolate). No timezone on balance history. No MCP document bytes. No multi-ledger. No push of `wrangler.jsonc`.
