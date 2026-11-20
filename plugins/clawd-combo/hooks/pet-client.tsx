// The desktop's pet, after clawd-crew's sprite-client.tsx (GPL-3.0): the crew pixel art drawn as boxes of colour
// and stepped by the surface's own frame clock, so the band's redraws never restart it. A click posts to the hooks
// module, which answers with a random animation.

import type { ClientSurface } from 'claude-code'

import { PALETTE, W, framesOf } from './crew-sprites.js'

export type PetProps = { anim: string; px: number } // px: one art pixel, in columns (a row is twice as tall)

type State = { anim: string; frame: number; epoch: number }

const TICK_MS = 100
const ROWS = 18 // the last rows only ever held the tile's shadow

type Run = [color: string | null, length: number]
type Band = { rows: number; runs: Run[]; sig: string }

const bandsOf = (grid: Uint8Array) => {
  const bands: Band[] = []
  for (let y = 0; y < ROWS; y++) {
    const runs: Run[] = []
    let x = 0
    while (x < W) {
      const color = PALETTE[grid[y * W + x] ?? 0] ?? null
      let n = 1
      while (x + n < W && (PALETTE[grid[y * W + x + n] ?? 0] ?? null) === color) n += 1
      runs.push([color, n])
      x += n
    }
    const sig = JSON.stringify(runs)
    const last = bands[bands.length - 1]
    if (last && last.sig === sig) last.rows += 1
    else bands.push({ rows: 1, runs, sig })
  }
  return bands
}

const animations = new Map<string, { ms: number; frames: Band[][] }>()
const animationOf = (anim: string) => {
  let held = animations.get(anim)
  if (!held) {
    const { ms, frames } = framesOf(anim)
    held = { ms, frames: frames.map(bandsOf) }
    animations.set(anim, held)
  }
  return held
}

const started = new WeakSet<object>()

export default function ClawdPet(props: PetProps, surface: ClientSurface<State>) {
  const { Box } = surface.elements
  const pw = props.px
  const ph = props.px / 2

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
      const { ms, frames } = animationOf(held.anim)
      const frame = Math.floor(t / ms) % frames.length
      if (frame !== held.frame) surface.setState({ ...held, frame })
    })
    surface.onPointer(e => {
      if (e.type === 'down' && e.button !== 'right' && e.button !== 'middle') surface.post({ shuffle: true })
    })
  }

  let { anim, frame } = surface.state ?? { anim: props.anim, frame: 0 }
  if (surface.state === undefined || surface.state.anim !== props.anim) {
    anim = props.anim
    frame = 0
    surface.setState({ anim, frame, epoch: (surface.state?.epoch ?? 0) + 1 })
  }

  const { frames } = animationOf(anim)
  const bands = frames[frame % frames.length] ?? []
  return (
    <Box flexDirection="column" width={W * pw} height={ROWS * ph}>
      {bands.map(band => {
        const height = band.rows * ph
        if (band.runs.length === 1 && band.runs[0]![0] === null) return <Box height={height} />
        return (
          <Box flexDirection="row" height={height}>
            {band.runs.map(([color, n]) =>
              color === null ? <Box width={n * pw} height={height} /> : <Box width={n * pw} height={height} backgroundColor={color} />,
            )}
          </Box>
        )
      })}
    </Box>
  )
}
