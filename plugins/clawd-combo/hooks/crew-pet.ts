// The pet: clawd-crew's Clawds (crew-sprites.js) and its rules for which one shows. A tool picks a mood as crew's
// describeTool does, a mood plays one of its three animations at random, and a new mood waits until the shown one
// has had 2 s, unless either is urgent (waiting, done, error).

import { PALETTE, VARIANTS, W, framesOf } from './crew-sprites.js'

export type Mood =
  | 'idle' | 'sleeping' | 'thinking' | 'responding' | 'typing' | 'reading' | 'searching' | 'running' | 'browsing'
  | 'delegating' | 'rallying' | 'planning' | 'tooling' | 'waiting' | 'done' | 'error' | 'compacting'

export const moodForTool = (tool: string): Mood => {
  switch (tool) {
    case 'Edit': case 'MultiEdit': case 'Write': case 'NotebookEdit':
      return 'typing'
    case 'Read':
      return 'reading'
    case 'Grep': case 'Glob': case 'ToolSearch':
      return 'searching'
    case 'Bash': case 'PowerShell': case 'BashOutput': case 'TaskOutput': case 'Monitor':
      return 'running'
    case 'WebFetch': case 'WebSearch':
      return 'browsing'
    case 'Agent': case 'Task': case 'SendMessage':
      return 'delegating'
    case 'Workflow':
      return 'rallying'
    case 'TodoWrite': case 'TaskCreate': case 'TaskUpdate': case 'TaskList': case 'TaskGet': case 'EnterPlanMode':
      return 'planning'
    case 'ExitPlanMode': case 'AskUserQuestion':
      return 'waiting'
  }
  if (tool.startsWith('mcp__') && /browser|chrome|playwright|puppeteer/i.test(tool.split('__')[1] ?? '')) return 'browsing'
  return 'tooling'
}

const HOLD_MS = 2_000
const URGENT = new Set<Mood>(['waiting', 'done', 'error'])
let shown: { mood: Mood; anim: string; since: number } | null = null

const randomAnim = (mood: Mood) => {
  const list = VARIANTS[mood] ?? [[mood, 'Classic']]
  return list[Math.floor(Math.random() * list.length)]![0]
}

// a click on the pet: another animation of the mood it is in (each has up to three), kept until the mood changes
export const shufflePet = (now: number) => {
  const mood = shown?.mood ?? 'idle'
  const others = (VARIANTS[mood] ?? []).map(([anim]) => anim).filter(a => a !== shown?.anim)
  if (others.length) shown = { mood, anim: others[Math.floor(Math.random() * others.length)]!, since: now }
  return shown?.anim ?? randomAnim(mood)
}

// the animation to show now, and when it started
export const petAnim = (wanted: Mood, now: number) => {
  if (shown?.mood === wanted) return shown
  const isDue = !shown || URGENT.has(wanted) || URGENT.has(shown.mood) || now - shown.since >= HOLD_MS
  if (isDue) shown = { mood: wanted, anim: randomAnim(wanted), since: now }
  return shown!
}

// rows 0-17: the last two only ever held the tile's shadow
const ROWS_DRAWN = 18
export const PET_ASPECT = W / ROWS_DRAWN

const svgCache = new Map<string, string>()

// one animation as a self-contained SVG, no tile: SMIL flips the frames. The app rebuilds the Svg on every redraw
// of the band (4 a second), which restarts SMIL, so each build begins `elapsed` into the loop and plays on from there
export const petSvg = (anim: string, elapsed = 0) => {
  const begin = (Math.max(0, elapsed) / 1000).toFixed(2)
  const hit = svgCache.get(anim)
  if (hit) return hit.replaceAll('@B@', begin)
  const { ms, frames } = framesOf(anim)
  const n = frames.length
  const dur = +((ms * n) / 1000).toFixed(4)
  const t = (x: number) => +x.toFixed(4)
  const groups = frames.map((grid, i) => {
    const byColor = new Map<number, string>()
    for (let y = 0; y < ROWS_DRAWN; y++) {
      let x = 0
      while (x < W) {
        const c = grid[y * W + x] ?? 0
        let w = 1
        while (x + w < W && grid[y * W + x + w] === c) w++
        if (c) byColor.set(c, (byColor.get(c) ?? '') + `M${x} ${y}h${w}v1h-${w}z`)
        x += w
      }
    }
    const paths = [...byColor].map(([c, d]) => `<path fill="${PALETTE[c]}" d="${d}"/>`).join('')
    if (n === 1) return `<g>${paths}</g>`
    const from = t(i / n)
    const to = t((i + 1) / n)
    const [values, keyTimes] =
      i === 0 ? ['visible;hidden', `0;${to}`] : i === n - 1 ? ['hidden;visible', `0;${from}`] : ['hidden;visible;hidden', `0;${from};${to}`]
    return `<g visibility="${i === 0 ? 'visible' : 'hidden'}"><animate attributeName="visibility" values="${values}" keyTimes="${keyTimes}" dur="${dur}s" calcMode="discrete" begin="-@B@s" repeatCount="indefinite"/>${paths}</g>`
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${ROWS_DRAWN}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"><g shape-rendering="crispEdges">${groups.join('')}</g></svg>`
  svgCache.set(anim, svg)
  return svg.replaceAll('@B@', begin)
}

// ---- terminal: each 2 x 2 block of pixels is one quadrant glyph, as crew's cells.ts draws it

export const PET_COLUMNS = W / 2
export const PET_ROWS = ROWS_DRAWN / 2
const QUADRANTS = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'
const TERMINAL_DEFAULT = 0x01000000

const encode = (grid: Uint8Array) => {
  const words = new Uint32Array(PET_COLUMNS * PET_ROWS * 3)
  const at = (x: number, y: number) => {
    const hex = PALETTE[grid[y * W + x] ?? 0]
    return hex ? parseInt(hex.slice(1), 16) : undefined
  }
  for (let row = 0; row < PET_ROWS; row++)
    for (let col = 0; col < PET_COLUMNS; col++) {
      const px = [at(col * 2, row * 2), at(col * 2 + 1, row * 2), at(col * 2, row * 2 + 1), at(col * 2 + 1, row * 2 + 1)]
      const counts = new Map<number, number>()
      for (const p of px) if (p !== undefined) counts.set(p, (counts.get(p) ?? 0) + 1)
      const [fg, bg] = [...counts].sort((a, b) => b[1] - a[1]).map(([c]) => c)
      let mask = 0
      px.forEach((p, i) => { if (p !== undefined && p !== bg) mask |= 1 << i })
      const o = (row * PET_COLUMNS + col) * 3
      words[o] = QUADRANTS.charCodeAt(mask)
      words[o + 1] = mask === 0 || fg === undefined ? TERMINAL_DEFAULT : fg
      words[o + 2] = bg ?? TERMINAL_DEFAULT
    }
  return (new Uint8Array(words.buffer) as Uint8Array & { toBase64(): string }).toBase64()
}

const cellCache = new Map<string, { ms: number; cells: string[] }>()

export const petCells = (anim: string, since: number, now: number) => {
  let held = cellCache.get(anim)
  if (!held) {
    const { ms, frames } = framesOf(anim)
    held = { ms, cells: frames.map(encode) }
    cellCache.set(anim, held)
  }
  return held.cells[Math.floor(Math.max(0, now - since) / held.ms) % held.cells.length]!
}
