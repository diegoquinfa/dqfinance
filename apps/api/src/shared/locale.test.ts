import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveLocale } from './locale.ts'

test('picks the highest-ranked supported language', () => {
  assert.equal(resolveLocale('es-CO,es;q=0.9,en;q=0.8'), 'es')
  assert.equal(resolveLocale('fr-FR,en;q=0.5,es;q=0.7'), 'es')
  assert.equal(resolveLocale('en-US'), 'en')
})

test('falls back to English when nothing matches or the header is missing', () => {
  assert.equal(resolveLocale('fr,de;q=0.8'), 'en')
  assert.equal(resolveLocale(undefined), 'en')
  assert.equal(resolveLocale('es;q=0'), 'en')
})
