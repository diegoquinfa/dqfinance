import { useEffect, useState } from 'react'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/shared/ui/card'
import { FormError } from '#/shared/ui/field'
import { disablePush, enablePush, hasPushSubscription, pushSupported } from './push-api'

type PushState = 'checking' | 'unsupported' | 'denied' | 'off' | 'on'

/** The one place the app asks for notification permission, and only when the user clicks. */
export function PushCard() {
  const [state, setState] = useState<PushState>('checking')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!pushSupported()) return setState('unsupported')
    if (Notification.permission === 'denied') return setState('denied')
    void hasPushSubscription().then((active) => setState(active ? 'on' : 'off'))
  }, [])

  async function toggle() {
    setPending(true)
    setError(undefined)
    try {
      if (state === 'on') {
        await disablePush()
        setState('off')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      await enablePush()
      setState('on')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : m.error_generic())
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{m.settings_notifications()}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {state === 'denied' && <p className="text-sm text-muted-foreground">{m.push_denied()}</p>}
        {state === 'unsupported' && <p className="text-sm text-muted-foreground">{m.push_unsupported()}</p>}
        {(state === 'on' || state === 'off') && (
          <Button variant="outline" className="w-fit" disabled={pending} onClick={() => void toggle()}>
            {state === 'on' ? m.push_disable() : m.push_enable()}
          </Button>
        )}
        <FormError message={error} />
      </CardContent>
    </Card>
  )
}
