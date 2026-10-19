// Web Push handler. Chrome and Edge drop a subscription that pushes without a visible
// notification, so every push shows one, whatever the payload looks like.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    const data = event.data ? event.data.json() : null
    if (data && typeof data === 'object') payload = data
  } catch {
    payload = {}
  }
  const title = typeof payload.title === 'string' ? payload.title : 'DQFinance'
  const body = typeof payload.body === 'string' ? payload.body : undefined

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, { body })
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) client.postMessage({ type: 'finance-changed' })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const [client] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await (client ? client.focus() : self.clients.openWindow('/'))
    })(),
  )
})
