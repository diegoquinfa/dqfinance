import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MIN_PASSWORD_LENGTH, passwordProblem } from './password-rule.ts'

test('a repeated password that is missing is reported', () => {
  assert.equal(passwordProblem('correct horse', ''), 'missing')
})

test('a repeated password that differs is reported', () => {
  assert.equal(passwordProblem('correct horse', 'correct horst'), 'mismatch')
  assert.equal(passwordProblem('correct horse', 'Correct horse'), 'mismatch')
})

test('a password shorter than the minimum is reported', () => {
  const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
  assert.equal(passwordProblem(short, short), 'too_short')
  assert.equal(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH), 'a'.repeat(MIN_PASSWORD_LENGTH)), undefined)
})

test('two equal long-enough passwords pass', () => {
  assert.equal(passwordProblem('correct horse', 'correct horse'), undefined)
})
