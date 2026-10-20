import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryAdapter, type MemoryDB } from 'better-auth/adapters/memory'
import { createAuth } from './auth.ts'

const origin = 'https://app.test'
const secret = 'test-secret-that-is-long-enough-for-the-tests'

type TestEnv = Parameters<typeof createAuth>[0]

/** The tables the memory adapter serves; the OAuth ones the MCP plugin touches are here too. */
function emptyDb(): MemoryDB {
  return {
    user: [],
    session: [],
    account: [],
    verification: [],
    oauthApplication: [],
    oauthAccessToken: [],
    oauthConsent: [],
    oauthResource: [],
  }
}

/** A sender that pretends to be Resend, so the reset email can be read back. */
function fakeEmail() {
  const sent: { to: string; subject: string; text: string; html?: string }[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)))
    return new Response('{}', { status: 200 })
  }) as typeof fetch
  return {
    sent,
    restore() {
      globalThis.fetch = original
    },
  }
}

function testAuth(db = emptyDb()) {
  const auth = createAuth(
    {
      BETTER_AUTH_SECRET: secret,
      EMAIL_FROM: 'no-reply@app.test',
      RESEND_API_KEY: 'test-key',
    } as unknown as TestEnv,
    origin,
    memoryAdapter(db),
  )
  return { auth, db }
}

const credentials = { name: 'Ana', email: 'ana@app.test', password: 'longenough1' }
const signedUp = { ...credentials, confirmPassword: credentials.password }

const isRefusal = (code: string) => (error: { statusCode?: number; body?: { code?: string } }) =>
  error.statusCode === 400 && error.body?.code === code

/** The session cookie, the way the browser would send it. */
async function sessionCookie(auth: ReturnType<typeof testAuth>['auth']) {
  const session = await auth.api.signInEmail({
    body: { email: credentials.email, password: credentials.password },
    returnHeaders: true,
  })
  return new Headers({ cookie: session.headers.get('set-cookie')!.split(';')[0]! })
}

test('sign-up without the repeated password is refused', async () => {
  const { auth } = testAuth()
  await assert.rejects(auth.api.signUpEmail({ body: credentials as never }), isRefusal('PASSWORD_CONFIRMATION_MISSING'))
})

test('sign-up with a different repeated password is refused', async () => {
  const { auth } = testAuth()
  await assert.rejects(
    auth.api.signUpEmail({ body: { ...credentials, confirmPassword: 'longenough2' } as never }),
    isRefusal('PASSWORD_CONFIRMATION_MISMATCH'),
  )
})

test('sign-up with the repeated password stores no copy of it', async () => {
  const { auth, db } = testAuth()
  const result = await auth.api.signUpEmail({ body: signedUp as never })
  assert.equal(result.user.email, 'ana@app.test')
  assert.ok(!('confirmPassword' in (db.user?.[0] ?? {})))
})

test('sign-up with a short password is refused', async () => {
  const { auth } = testAuth()
  await assert.rejects(
    auth.api.signUpEmail({ body: { ...credentials, password: 'short', confirmPassword: 'short' } as never }),
    isRefusal('PASSWORD_TOO_SHORT'),
  )
})

test('change-password without the repeated new password is refused', async () => {
  const { auth } = testAuth()
  await auth.api.signUpEmail({ body: signedUp as never })
  const headers = await sessionCookie(auth)
  await assert.rejects(
    auth.api.changePassword({
      body: { currentPassword: credentials.password, newPassword: 'newlongenough1' } as never,
      headers,
    }),
    isRefusal('PASSWORD_CONFIRMATION_MISSING'),
  )
  await assert.rejects(
    auth.api.changePassword({
      body: {
        currentPassword: credentials.password,
        newPassword: 'newlongenough1',
        confirmPassword: 'otherlongenough',
      } as never,
      headers,
    }),
    isRefusal('PASSWORD_CONFIRMATION_MISMATCH'),
  )
})

test('change-password with the repeated new password goes through', async () => {
  const { auth } = testAuth()
  await auth.api.signUpEmail({ body: signedUp as never })
  const headers = await sessionCookie(auth)
  const result = await auth.api.changePassword({
    body: {
      currentPassword: credentials.password,
      newPassword: 'newlongenough1',
      confirmPassword: 'newlongenough1',
    } as never,
    headers,
  })
  assert.equal(result.user.email, credentials.email)
})

test('the reset email links to the reset page with the token', async () => {
  const email = fakeEmail()
  try {
    const { auth } = testAuth()
    await auth.api.signUpEmail({ body: signedUp as never })
    const response = await auth.api.requestPasswordReset({ body: { email: credentials.email } })
    assert.equal(response.status, true)
    assert.equal(email.sent.length, 1)
    const link = email.sent[0]!.text.match(/https:\/\/\S+/)?.[0]
    assert.ok(link?.startsWith(`${origin}/api/auth/reset-password/`))
    // The link is followed once, and it lands on the web page with the token in the query.
    const url = new URL(link!)
    const token = url.pathname.split('/').pop()!
    await assert.rejects(
      auth.api.requestPasswordResetCallback({
        params: { token },
        query: { callbackURL: url.searchParams.get('callbackURL')! },
      }),
      (error: { status?: string; headers?: Headers }) => {
        assert.equal(error.status, 'FOUND')
        assert.equal(error.headers?.get('location'), `${origin}/reset-password?token=${token}`)
        return true
      },
    )
  } finally {
    email.restore()
  }
})

test('an unknown address gets the same answer and no email', async () => {
  const email = fakeEmail()
  try {
    const { auth } = testAuth()
    await auth.api.signUpEmail({ body: signedUp as never })
    const known = await auth.api.requestPasswordReset({ body: { email: credentials.email } })
    const unknown = await auth.api.requestPasswordReset({ body: { email: 'nobody@app.test' } })
    assert.deepEqual(unknown, known)
    assert.equal(email.sent.length, 1)
  } finally {
    email.restore()
  }
})

test('reset-password without the repeated new password is refused', async () => {
  const email = fakeEmail()
  try {
    const { auth } = testAuth()
    await auth.api.signUpEmail({ body: signedUp as never })
    await auth.api.requestPasswordReset({ body: { email: credentials.email } })
    const link = email.sent[0]!.text.match(/https:\/\/\S+/)?.[0]
    const token = new URL(link!).pathname.split('/').pop()!
    await assert.rejects(
      auth.api.resetPassword({ body: { newPassword: 'newlongenough1', token } as never }),
      isRefusal('PASSWORD_CONFIRMATION_MISSING'),
    )
    const result = await auth.api.resetPassword({
      body: { newPassword: 'newlongenough1', confirmPassword: 'newlongenough1', token } as never,
    })
    assert.equal(result.status, true)
  } finally {
    email.restore()
  }
})
