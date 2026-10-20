import assert from 'node:assert/strict'
import { test } from 'node:test'
import { confirmPasswordProblem, MIN_PASSWORD_LENGTH } from './confirm-password.ts'

test('a repeated password that is missing is reported', () => {
  assert.equal(confirmPasswordProblem('correct horse', undefined), 'missing')
  assert.equal(confirmPasswordProblem('correct horse', ''), 'missing')
})

test('a repeated password that differs is reported', () => {
  assert.equal(confirmPasswordProblem('correct horse', 'correct horst'), 'mismatch')
  assert.equal(confirmPasswordProblem('correct horse', 'Correct horse'), 'mismatch')
})

test('a password shorter than the minimum is reported', () => {
  const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
  assert.equal(confirmPasswordProblem(short, short), 'too_short')
  assert.equal(confirmPasswordProblem('a'.repeat(MIN_PASSWORD_LENGTH), 'a'.repeat(MIN_PASSWORD_LENGTH)), null)
})

test('two equal long-enough passwords pass', () => {
  assert.equal(confirmPasswordProblem('correct horse', 'correct horse'), null)
})

test('a missing password is left to Better Auth', () => {
  assert.equal(confirmPasswordProblem(undefined, 'correct horse'), null)
})
