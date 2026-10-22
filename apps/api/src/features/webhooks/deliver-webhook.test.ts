import assert from 'node:assert/strict'
import { test } from 'node:test'
import { billDeliveryId, deliverWebhook } from './deliver-webhook.ts'
import { signatureHeader } from './webhook-signature.ts'

const hook = { url: 'https://receiver.example.com/dqfinance', secret: 'shhh' }

type FetchCall = { url: string; init: RequestInit }

/** Replaces `fetch` so the call can be inspected without a network. */
function fakeFetch(response: (call: FetchCall) => Response) {
  const calls: FetchCall[] = []
  const original = globalThis.fetch
  return {
    calls,
    install() {
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

test('the call is a signed post of exactly the body that was sent', async () => {
  const fetcher = fakeFetch(() => new Response(null, { status: 204 }))
  fetcher.install()
  const payload = { event: 'bill.due', bill: { id: 'bill-1', dueOn: '2026-11-01' } }
  try {
    const result = await deliverWebhook(hook, 'bill.due', payload, billDeliveryId('bill-1', '2026-11-01'))
    assert.deepEqual(result, { delivered: true, status: 204 })
  } finally {
    fetcher.restore()
  }
  const call = fetcher.calls[0]
  assert.ok(call)
  const headers = call.init.headers as Record<string, string>
  assert.equal(call.url, hook.url)
  assert.equal(call.init.method, 'POST')
  assert.equal(call.init.redirect, 'manual')
  assert.equal(headers['Content-Type'], 'application/json')
  assert.equal(headers['X-DQFinance-Event'], 'bill.due')
  assert.equal(headers['X-DQFinance-Delivery'], 'bill-1:2026-11-01')
  assert.equal(String(call.init.body), JSON.stringify(payload))
  // The signature covers the delivered bytes, not a re-serialisation of the payload.
  assert.equal(headers['X-DQFinance-Signature'], await signatureHeader(hook.secret, String(call.init.body)))
})

test('the delivery id is stable for one bill and due date, and tells another due date apart', () => {
  assert.equal(billDeliveryId('bill-1', '2026-11-01'), billDeliveryId('bill-1', '2026-11-01'))
  assert.notEqual(billDeliveryId('bill-1', '2026-11-01'), billDeliveryId('bill-1', '2026-12-01'))
  assert.notEqual(billDeliveryId('bill-1', '2026-11-01'), billDeliveryId('bill-2', '2026-11-01'))
})

test('the same bill and due date send the same delivery id twice', async () => {
  const fetcher = fakeFetch(() => new Response(null, { status: 200 }))
  fetcher.install()
  try {
    const deliveryId = billDeliveryId('bill-1', '2026-11-01')
    await deliverWebhook(hook, 'bill.due', { bill: { id: 'bill-1' } }, deliveryId)
    await deliverWebhook(hook, 'bill.due', { bill: { id: 'bill-1' } }, deliveryId)
  } finally {
    fetcher.restore()
  }
  const ids = fetcher.calls.map((call) => (call.init.headers as Record<string, string>)['X-DQFinance-Delivery'])
  assert.deepEqual(ids, ['bill-1:2026-11-01', 'bill-1:2026-11-01'])
})

test('a redirect is a failure, not a delivery', async () => {
  const fetcher = fakeFetch(
    () => new Response(null, { status: 302, headers: { Location: 'https://127.0.0.1/' } }),
  )
  fetcher.install()
  try {
    const result = await deliverWebhook(hook, 'bill.due', {}, billDeliveryId('bill-1', '2026-11-01'))
    assert.equal(result.delivered, false)
    assert.equal(result.status, 302)
    assert.match(result.error ?? '', /redirect/i)
    // The redirect is never followed, so the body cannot reach a host the guard did not check.
    assert.equal(fetcher.calls[0]?.init.redirect, 'manual')
  } finally {
    fetcher.restore()
  }
})

test('an error answer is a failure', async () => {
  const fetcher = fakeFetch(() => new Response('nope', { status: 500 }))
  fetcher.install()
  try {
    const result = await deliverWebhook(hook, 'bill.due', {}, billDeliveryId('bill-1', '2026-11-01'))
    assert.equal(result.delivered, false)
    assert.equal(result.status, 500)
    assert.match(result.error ?? '', /500/)
  } finally {
    fetcher.restore()
  }
})

test('a private endpoint is refused before any call is made', async () => {
  const fetcher = fakeFetch(() => new Response(null, { status: 200 }))
  fetcher.install()
  try {
    for (const url of ['http://receiver.example.com/hook', 'https://127.0.0.1/hook']) {
      const result = await deliverWebhook({ ...hook, url }, 'bill.due', {}, billDeliveryId('bill-1', '2026-11-01'))
      assert.equal(result.delivered, false)
      assert.match(result.error ?? '', /public https/)
    }
  } finally {
    fetcher.restore()
  }
  assert.equal(fetcher.calls.length, 0)
})
