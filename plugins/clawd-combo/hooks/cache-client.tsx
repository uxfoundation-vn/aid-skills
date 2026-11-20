// The desktop's prompt-cache countdown: counts down on the surface's own frame clock, so the band is not redrawn
// every second (a redraw rebuilds the native Compact button, which flickered). The hooks module hands it the
// cache's end and the moment the band drew; a later redraw re-syncs it.

import type { ClientSurface } from 'claude-code'

export type CacheProps = { endAt: number; now: number; color: string; expiredColor: string }

type State = { endAt: number; now: number; shown: string; epoch: number }

const TICK_MS = 250

// expired, in red: a nudge to /compact before the next prompt re-writes the whole context
const EXPIRED = '· cache expired · compact?'

const label = (left: number) => {
  if (left <= 0) return EXPIRED
  const sec = Math.ceil(left / 1000)
  return `· cache ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const started = new WeakSet<object>()

export default function CacheClock(props: CacheProps, surface: ClientSurface<State>) {
  const { Text } = surface.elements

  if (!started.has(surface)) {
    started.add(surface)
    let t = 0
    let epoch = -1
    surface.every(TICK_MS, () => {
      const held = surface.state
      if (!held) return
      if (held.epoch !== epoch) {
        epoch = held.epoch
        t = 0
      }
      t += TICK_MS
      const shown = label(held.endAt - held.now - t)
      if (shown !== held.shown) surface.setState({ ...held, shown })
    })
  }

  let shown = surface.state?.shown ?? label(props.endAt - props.now)
  const held = surface.state
  if (held === undefined || held.endAt !== props.endAt || held.now !== props.now) {
    shown = label(props.endAt - props.now)
    surface.setState({ endAt: props.endAt, now: props.now, shown, epoch: (held?.epoch ?? 0) + 1 })
  }

  return (
    <Text color={shown === EXPIRED ? props.expiredColor : props.color} bold={shown === EXPIRED} wrap="truncate-end">
      {shown}
    </Text>
  )
}
