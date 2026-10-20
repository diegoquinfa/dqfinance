import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeHtml, passwordResetMessage } from './password-reset-message.ts'

const url = 'https://app.test/api/auth/reset-password/abc123?callbackURL=https%3A%2F%2Fapp.test%2Freset-password'

test('the message carries the link in both bodies', () => {
  const message = passwordResetMessage('en', url)
  assert.ok(message.text.includes(url))
  assert.ok(message.html.includes(escapeHtml(url)))
})

test('each locale has its own subject and body', () => {
  const en = passwordResetMessage('en', url)
  const es = passwordResetMessage('es', url)
  assert.notEqual(en.subject, es.subject)
  assert.notEqual(en.text, es.text)
  assert.ok(es.subject.includes('Restablece tu contraseña'))
  assert.ok(es.text.includes('restablecer la contraseña'))
  assert.ok(en.text.includes('expires in 1 hour'))
  assert.ok(es.text.includes('1 hora'))
})

test('the HTML body is one paragraph with an escaped link', () => {
  const message = passwordResetMessage('en', 'https://app.test/reset?a=1&b=<2>')
  assert.ok(message.html.startsWith('<p>'))
  assert.ok(message.html.endsWith('</p>'))
  assert.ok(message.html.includes('&amp;'))
  assert.ok(message.html.includes('&lt;2&gt;'))
  assert.ok(!message.html.includes('<2>'))
})
