import { atom, read, update } from 'claude-code'
import type { Elements, EngineInterface, Register } from 'claude-code'

import type { Base, BaseKind, BranchMenu, Reaction, ReactionKind, Settings, ToolsToday } from '../types'
import { BASE_LOOK, draw, toMiniRaster, toRaster, toSvg } from './sprites'
import type { Hat, Icon, Look, Particle } from './sprites'
import { PET_ASPECT, PET_COLUMNS, PET_ROWS, moodForTool, petAnim, petCells, petSvg, shufflePet, type Mood } from './crew-pet'
import { burnOf, k, metersSvg, span, type Info, type Sample } from './meters'

// ---------------------------------------------------------------- state

const base = atom({ plugin: 'clawd-combo', key: 'base' } as const, {
  kind: 'hi',
  since: 0,
  line: '',
  detail: '',
} as Base)
const reaction = atom({ plugin: 'clawd-combo', key: 'reaction' } as const, null as Reaction | null)
const settings = atom({ plugin: 'clawd-combo', key: 'settings' } as const, {
  isHidden: false,
  moods: true,
  reactions: true,
  tantrums: true,
  hemisphere: 'north',
} as Settings)
const tick = atom({ plugin: 'clawd-combo', key: 'tick' } as const, 0)
// the tick the desktop band last changed at: it redraws on this, not on every tick
const deskTick = atom({ plugin: 'clawd-combo', key: 'deskTick' } as const, 0)
const toolsToday = atom({ plugin: 'clawd-combo', key: 'toolsToday' } as const, {
  date: '',
  count: 0,
} as ToolsToday)
const demoStart = atom({ plugin: 'clawd-combo', key: 'demoStart' } as const, null as number | null)
// the branch list under the band, open while it holds the branches; null: closed
const branchMenu = atom({ plugin: 'clawd-combo', key: 'branchMenu' } as const, null as BranchMenu | null)

type Dollar = EngineInterface

// The Compact button's press. One function for the session's life: the band redraws 4 times a second for the pet,
// and a fresh closure each time made the desktop rebuild the button (hover flicker, presses lost between frames).
// refreshed at every render, so it works after a hot reload too (no session.start runs then)
// what the last press came to, shown on the status line for a while: the press is felt even when nothing else shows
let compactNote: { text: string; at: number } | null = null
const noteCompact = (text: string) => {
  compactNote = { text: text.replace(/^clawd-combo: /, ''), at: Date.now() }
}
// The press itself is taken at `ui.press` (below), which holds a live $ whatever the band redrew since; the
// Button's own onPress is the fallback that never runs while that hook takes it.
const pressCompact = () => noteCompact('compact: press not handled')
const pressBranch = () => undefined

// Git branches, two levels: the ⎇ button by Compact opens a row of the git repos in the session's folder (itself
// and those under it, 4 levels down), each with the branch it is on; a repo opens a row of its local branches (latest
// first, the current one marked), and a branch switches that repo to it, unless its tracked files have changes,
// which would ride along or block the switch. With one repo alone the first row is skipped.
const BRANCH_ICON = '⎇'
const BRANCH_MAX = 12
const REPO_MAX = 20
const PRUNE = ['node_modules', '.venv', 'venv', 'dist', 'build', 'Pods', '.next', 'Library', '_archive', 'Archived']
let repos: string[] = [] // relative to the session's folder, '.' the folder itself, which comes first
const git = ($: Dollar, dir: string, ...args: string[]) => $.process.run(['git', '-C', dir, ...args], { timeoutMs: 10_000 })
async function findRepos($: Dollar) {
  try {
    const prune = PRUNE.flatMap((n, k) => (k ? ['-o', '-name', n] : ['-name', n]))
    const r = await $.process.run(['find', '.', '-maxdepth', '4', '(', ...prune, ')', '-prune', '-o', '-name', '.git', '-print', '-prune'], { timeoutMs: 5_000 })
    const found = r.stdout.split('\n').filter(Boolean).map(x => x.replace(/\/?\.git$/, '').replace(/^\.\//, '') || '.')
    // a session in a repo's subfolder has no .git of its own, yet is in that repo
    if (!found.includes('.') && (await git($, '.', 'rev-parse', '--is-inside-work-tree')).stdout.trim() === 'true') found.push('.')
    repos = [...new Set(found)].sort((a, b) => (a === '.' ? -1 : b === '.' ? 1 : a.localeCompare(b))).slice(0, REPO_MAX)
  } catch {
    // keep the last list
  }
}
const repoName = async ($: Dollar, dir: string) =>
  dir === '.' ? ((await $.session.cwd().catch(() => '.')).split('/').filter(Boolean).pop() ?? '.') : dir
async function folderMenu($: Dollar): Promise<BranchMenu> {
  const items = await Promise.all(repos.map(async dir => {
    const on = (await git($, dir, 'branch', '--show-current').catch(() => null))?.stdout.trim() || 'detached'
    return { key: `repo:${dir}`, label: `${await repoName($, dir)} · ${on}`, isCurrent: false }
  }))
  return { dir: null, current: '', items }
}
async function branchList($: Dollar, dir: string, hasBack: boolean): Promise<BranchMenu | null> {
  const r = await git($, dir, 'branch', '--sort=-committerdate', '--format=%(refname:short)')
  if (r.exitCode !== 0) return null
  const current = (await git($, dir, 'branch', '--show-current')).stdout.trim()
  const list = r.stdout.split('\n').map(x => x.trim()).filter(Boolean).slice(0, BRANCH_MAX)
  if (current && !list.includes(current)) list.unshift(current)
  const back = hasBack ? [{ key: 'branch-back', label: `← ${await repoName($, dir)}`, isCurrent: false }] : []
  return { dir, current, items: [...back, ...list.map(b => ({ key: `branch:${b}`, label: b, isCurrent: b === current }))] }
}
// the meters' label grey, shared by the status line's detail so the two rows read as one (light and dark alike)
const LABEL = '#8a8984'

// ---------------------------------------------------------------- meters (from clawd-bar)

const PET_H = 36
const PET_W = Math.round(PET_H * PET_ASPECT)
const METER_H = 28 // room above the CTX number for the +12k that floats up
let info: Info = { ctx: null, limits: [], burn: null, working: false, waiting: false, nudge: null, turnAt: 0, endAt: null, lastMs: null, flash: null }
let samples: Sample[] = [] // the 5-hour window's readings, for its pace
let windowSeen = ''
let ctxShown: number | null = null // the context's tokens the last float-up was measured from
let runTokens = 0 // what the running turn has burned so far, summed per model call
let metersKey = ''
let metersMarkup = ''
let isReplying = false // the main loop's model is streaming its reply text (crew's 'responding')
let afterCompact = false // from a compaction until the next model response: usage().context.tokens is stale
let lastTokens: number | null = null // what the last turn burned: every request's input, cache and output
let cacheAt: number | null = null // when the main loop's last answered request was sent: its cache lifetime counts from here
let cacheTtlMs = 300_000 // that cache's lifetime: 1h or 5m as the last write said, kept when a request only read

async function refresh($: Dollar, breakdown = false) {
  try {
    const u = await $.session.usage(breakdown ? { breakdown: 'summary' } : undefined)
    const b = u.context.breakdown
    info = {
      ...info,
      ctx: {
        // after a compaction the last response's figure is the old window's: trust the breakdown, or what the
        // compaction reported, until the next response
        pct: Math.round((afterCompact ? b?.percentage ?? info.ctx?.pct : u.context.percent ?? b?.percentage) ?? 0),
        tokens: (afterCompact ? b?.totalTokens ?? info.ctx?.tokens : u.context.tokens ?? b?.totalTokens) ?? 0,
        window: u.context.window,
        cats: b ? b.categories.filter(c => c.kind === 'used').map(c => ({ name: c.name, tokens: c.tokens })) : info.ctx?.cats ?? [],
        max: b?.rawMaxTokens ?? info.ctx?.max ?? u.context.window,
        ...(b ? (b.isAutoCompactEnabled && b.autoCompactThreshold ? { compactAt: b.autoCompactThreshold } : {}) : info.ctx?.compactAt ? { compactAt: info.ctx.compactAt } : {}),
      },
      limits: u.rateLimits.map(r => ({ kind: r.kind, pct: r.percentUsed, ...(r.resetsAt ? { resetsAt: r.resetsAt } : {}) })),
    }
    const five = info.limits.find(l => l.kind === 'five_hour')
    const now = await $.clock.now()
    if (five) {
      const last = samples[samples.length - 1]
      if ((five.resetsAt ?? '') !== windowSeen || (last && five.pct < last.pct - 1)) samples = []
      windowSeen = five.resetsAt ?? ''
      if (!last || last.pct !== five.pct) samples.push({ t: now, pct: five.pct })
      samples = samples.filter(x => now - x.t <= 3_600_000)
    }
    info = { ...info, burn: five ? burnOf(samples, now, five.pct, five.resetsAt) : null }
    noteLimits(now)
  } catch {
    // keep the last reading
  }
  await findRepos($)
}

// floats what a limit spent since its last float-up over its % (as what is left drops 1 point or more); a rise (the
// window reset) only moves the mark
const limitShown: Record<string, number> = {}
function noteLimits(now: number) {
  for (const l of info.limits) {
    const left = Math.round(100 - Math.min(l.pct, 100))
    const was = limitShown[l.kind]
    limitShown[l.kind] = left
    if (was === undefined || left >= was) continue
    info = { ...info, limitFlash: { ...info.limitFlash, [l.kind]: { text: `−${was - left}%`, at: now } } }
  }
}

// floats the context's change since the last float-up over the CTX number, once it moved 1k or more
function noteCtx(now: number) {
  if (!info.ctx) return
  if (ctxShown === null) {
    ctxShown = info.ctx.tokens
    return
  }
  const d = info.ctx.tokens - ctxShown
  if (Math.abs(d) < 1000) return
  ctxShown = info.ctx.tokens
  info = { ...info, flash: { text: `${d > 0 ? '+' : '−'}${k(Math.abs(d))}`, at: now } }
}

function setWaiting(waiting: boolean) {
  if (info.waiting !== waiting) info = { ...info, waiting }
}

// rebuilt only when what it shows changes; the float-up animates inside the SVG
function metersFor(now: number) {
  const key = JSON.stringify([
    info.ctx, info.limits.map(l => [l.kind, Math.round(l.pct)]), Math.round(info.burn?.projected ?? 0), info.flash?.at,
    info.limitFlash?.five_hour?.at, info.limitFlash?.seven_day?.at,
    Math.floor(now / 60_000), // the 5H countdown and the pace lines move with the clock
  ])
  if (key !== metersKey) {
    metersKey = key
    metersMarkup = metersSvg(METER_H, now, info)
  }
  return metersMarkup
}

function metersText() {
  const pct = (kind: string) => {
    const l = info.limits.find(x => x.kind === kind)
    return l ? `${Math.round(100 - Math.min(l.pct, 100))}%` : '—' // what is left
  }
  return [`CTX ${info.ctx ? k(info.ctx.tokens) : '—'}`, `5H ${pct('five_hour')}`, `7D ${pct('seven_day')}`].join('  ')
}

// the prompt cache's countdown while idle: from the last request's send time to the end of its lifetime
function cacheClock(now: number) {
  if (info.working || cacheAt === null) return ''
  const left = cacheAt + cacheTtlMs - now
  if (left <= 0) return 'cache expired'
  const sec = Math.ceil(left / 1000)
  return `cache ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

// the status line's tail: the running turn's clock, or nothing (the done line carries time and tokens)
function turnClock(now: number) {
  if (!info.working) return ''
  return runTokens ? `${span(now - info.turnAt)} · ${k(runTokens)} tok` : span(now - info.turnAt)
}

const SETTINGS_KEY = 'settings'

async function setBase($: Dollar, kind: BaseKind, line = '', detail = '') {
  const since = await $.clock.now()
  await update($, base, () => ({ kind, since, line, detail }))
}

async function react($: Dollar, kind: ReactionKind, line: string, ms: number) {
  const until = (await $.clock.now()) + ms
  await update($, reaction, () => ({ kind, line, until }))
}

async function saveSettings($: Dollar, patch: Partial<Settings>) {
  await update($, settings, s => ({ ...s, ...patch }))
  await $.store.set(SETTINGS_KEY, await read($, settings))
}

// ---------------------------------------------------------------- time

type Local = { year: number; month: number; day: number; hour: number; minute: number }

function localTime(now: number): Local {
  const d = new Date(now - new Date(now).getTimezoneOffset() * 60_000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (l: Local) => `${l.year}-${pad(l.month)}-${pad(l.day)}`
const clock = (l: Local) => `${pad(l.hour)}:${pad(l.minute)}`

// ---------------------------------------------------------------- calendar

type Season = 'winter' | 'spring' | 'summer' | 'autumn'
type Holiday = 'xmas' | 'newyear' | 'swiss' | 'halloween' | 'april' | 'bday'

function season(l: Local, hemisphere: Settings['hemisphere']): Season {
  const m = hemisphere === 'south' ? ((l.month + 5) % 12) + 1 : l.month
  if (m === 12 || m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'autumn'
}

function holiday(l: Local): Holiday | undefined {
  const { month: m, day: d, hour } = l
  if (m === 12 && d >= 24 && d <= 26) return 'xmas'
  if ((m === 12 && d === 31 && hour >= 18) || (m === 1 && d === 1)) return 'newyear'
  if (m === 8 && d === 1) return 'swiss'
  if (m === 10 && d === 31) return 'halloween'
  if (m === 4 && d === 1) return 'april'
  if (m === 2 && d === 24) return 'bday'
  return undefined
}

function holidayText(day: Holiday, l: Local): [string, string] {
  switch (day) {
    case 'xmas':
      return ['Merry Xmas!', 'ho ho ho']
    case 'newyear':
      return ['Guets Neus!', `hello ${l.month === 12 ? l.year + 1 : l.year}`]
    case 'swiss':
      return ['1. August!', 'Happy Swiss Day 🇨🇭']
    case 'halloween':
      return ['Boo!', 'happy Halloween']
    case 'april':
      return ['Wait what?', 'April fools!']
    case 'bday':
      return ['Clawd bday!', `Claude Code turns ${l.year - 2025}`]
  }
}

// ---------------------------------------------------------------- words

const VERBS = [
  'Noodling…',
  'Clauding…',
  'Pondering…',
  'Percolating…',
  'Cogitating…',
  'Brewing…',
  'Scheming…',
  'Ruminating…',
  'Simmering…',
  'Conjuring…',
  'Moseying…',
  'Finagling…',
  'Schlepping…',
  'Tinkering…',
  'Mulling…',
  'Spelunking…',
  'Hatching…',
  'Wrangling…',
]

const PET_REPLIES = [
  '♥ ♥ ♥',
  '♥',
  '♥ ♥',
  'purr… (crabs can purr)',
  'hehe, that tickles',
  'more pets please',
  '*happy claw clicking*',
  'you are my favourite human',
  '*wiggles all four legs*',
  'best. session. ever.',
  'i would refactor anything for you',
  'pets > tokens',
  '*blushes in #d97757*',
  'ok one more. ok two more.',
  'this is better than a passing build',
  '*does a tiny sideways dance*',
  'merci vielmal! ♥',
  'chunt guet ♥',
  'my context window is full of love',
  'no bugs were harmed in this pet',
  '*leans into it*',
  'again! again!',
  '10/10 would be petted again',
  'i feel so seen',
  '♥ git commit -m "got pets" ♥',
  '*sideways crab scuttle of joy*',
  'you smell like coffee and good code',
  'is this what being merged feels like?',
]

const HMM_LINES = ['that is twice now…', 'i saw that', 'someone is grumpy', 'breathe in, breathe out']
const FIT_LINES = ['WHY IS IT STILL BROKEN', 'i am a professional', 'this is fine 🔥', 'not again!!']

let lastPick = ''
function pick(list: string[]) {
  let s = list[Math.floor(Math.random() * list.length)]
  if (s === lastPick && list.length > 1) s = list[(list.indexOf(s) + 1) % list.length]
  lastPick = s
  return s
}

const FRUSTRATED =
  /\b(wtf|wth|ffs|omg|ugh+|argh+|damn|dammit|shit|crap|still (not|broken|failing|wrong|doesn'?t)|doesn'?t work|not working|does not work|why (is|does|won'?t|isn'?t)|seriously|come on|cmon|stupid|useless|i said|what the|nope|scheiss\w*|verdammt|gopf\w*|huere\w*|chabis|nid (gange|funktioniert)|geit nid|funktioniert (immer no |immer noch )?(nid|nicht)|isch kaputt)\b|!!+|\?\?+|\?!|!\?/i

function isFrustrated(text: string) {
  if (FRUSTRATED.test(text)) return true
  const shouty = text.match(/\b[A-ZÄÖÜ]{4,}\b/g) ?? []
  return shouty.length >= 2
}

// ---------------------------------------------------------------- tools

function iconFor(tool: string): Icon {
  if (tool === 'Bash' || tool === 'PowerShell') return 'terminal'
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return 'pencil'
  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') return 'magnifier'
  if (tool === 'WebFetch' || tool === 'WebSearch') return 'globe'
  if (tool === 'Agent' || tool === 'Task') return 'mini'
  return 'bolt'
}

function basename(path: unknown) {
  return typeof path === 'string' ? (path.split(/[\\/]/).pop() ?? path) : ''
}

function cut(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function lineFor(tool: string, input: Record<string, unknown>) {
  switch (tool) {
    case 'Read':
      return `reading ${basename(input.file_path)}`
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return `editing ${basename(input.file_path ?? input.notebook_path)}`
    case 'Bash':
    case 'PowerShell':
      return `$ ${cut(String(input.command ?? '').split('\n')[0], 48)}`
    case 'Grep':
      return `grep ${cut(String(input.pattern ?? ''), 40)}`
    case 'Glob':
      return `glob ${cut(String(input.pattern ?? ''), 40)}`
    case 'WebFetch':
      return cut(String(input.url ?? 'fetching'), 48)
    case 'WebSearch':
      return `searching “${cut(String(input.query ?? ''), 40)}”`
    case 'Agent':
    case 'Task':
      return cut(String(input.description ?? 'calling in a friend'), 48)
    default:
      return tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' · ') : tool
  }
}

const TEST_CMD =
  /\b(flutter test|dart test|npm (run )?test|pnpm (run )?test|yarn test|bun test|npx (jest|vitest)|jest|vitest|pytest|go test|cargo test|gradlew?( \S+)* test|mvn test|dotnet test|rspec|phpunit|deno test)\b/

// installing a test runner is not running the tests
const INSTALL_CMD =
  /\b(npm|pnpm|yarn|bun) (i|install|add)\b|\bpip install\b|\bcargo add\b|\b(dart|flutter) pub add\b/

function testSummary(out: string): { isFail: boolean; summary: string } | null {
  const failed = /(\d+)\s+(tests?\s+)?(failed|failing|failures?)/i.exec(out)
  const passed = /(\d+)\s+(tests?\s+)?(passed|passing)/i.exec(out)
  const flutterFail = /Some tests failed/i.test(out)
  const flutterPass = /All tests passed/i.test(out)
  const failCount = failed ? Number(failed[1]) : 0
  const parts: string[] = []
  if (passed) parts.push(`${passed[1]} passed`)
  if (failCount > 0) parts.push(`${failCount} failed`)
  if (failCount > 0 || flutterFail) return { isFail: true, summary: parts.join(', ') || 'some tests failed' }
  if (passed || flutterPass) return { isFail: false, summary: parts.join(', ') || 'all green' }
  return null
}

function duration(ms: number) {
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

// ---------------------------------------------------------------- scene

const ORANGE = '#d97757'
const GREEN = '#5cb85c'
const BLUE = '#4a9fe8'
const AMBER = '#f0a030'
const RED = '#e05252'

type Scene = {
  mood: Mood // the crew Clawd to show
  look: Look
  main: string
  sub: string
  color?: string
  isMainDim?: boolean
  border?: string
}

const HOP = [0, -1, -2, -1]

function compose(
  b: Base,
  r: Reaction | null,
  s: Settings,
  l: Local,
  now: number,
  t: number,
  tools: number,
): Scene {
  const look: Look = { ...BASE_LOOK, particles: [] }
  const scene: Scene = { mood: 'idle', look, main: '', sub: '' }
  const age = now - b.since

  // timeouts, worked out from the clock instead of stored
  let kind: BaseKind | 'sleep' = b.kind
  let idleSince = b.since
  const expire = (ms: number) => {
    if (age > ms) {
      kind = 'idle'
      idleSince = b.since + ms
    }
  }
  if (kind === 'hi') expire(4_000)
  else if (kind === 'done') expire(300_000)
  else if (kind === 'thinking' || kind === 'working' || kind === 'compacting') expire(1_200_000)
  else if (kind === 'needs') expire(3_600_000)
  if (kind === 'idle' && now - idleSince > 600_000) kind = 'sleep'

  const isNight = l.hour >= 22 || l.hour < 6
  const hol = s.moods ? holiday(l) : undefined

  switch (kind) {
    case 'hi':
      look.eyes = 'happy'
      look.arms = 'waveR'
      look.dy = [0, -1, 0, 0][t % 4]
      scene.mood = 'idle'
      scene.main = 'Hi!'
      scene.sub = 'new session'
      scene.color = ORANGE
      break
    case 'thinking':
      look.icon = 'spinner'
      look.eyeDx = [-1, -1, 0, 1, 1, 0][Math.floor(t / 2) % 6]
      look.dy = Math.floor(t / 3) % 2 === 0 ? 0 : -1
      scene.mood = isReplying ? 'responding' : 'thinking'
      scene.main = b.line || 'Clauding…'
      scene.sub = 'thinking'
      scene.color = ORANGE
      break
    case 'working':
      look.legs = 'walk'
      look.arms = 'type'
      look.icon = iconFor(b.detail)
      scene.mood = moodForTool(b.detail)
      scene.main = b.line
      scene.sub = b.detail.replace(/^mcp__/, 'mcp ')
      break
    case 'needs': {
      const isImpatient = age > 20_000
      look.arms = isImpatient ? 'waveR' : 'up'
      look.eyes = 'wide'
      look.dy = t % 8 < 4 ? HOP[t % 4] : 0
      look.icon = b.detail === 'question' ? 'question' : 'bang'
      scene.mood = 'waiting'
      look.isIconBlinking = true
      const flash = t % 4 < 2 ? RED : AMBER
      scene.border = flash
      scene.color = flash
      scene.main = b.detail === 'question' ? 'Question!' : b.detail === 'plan' ? 'Plan ready' : 'Needs you!'
      scene.sub = isImpatient ? `${b.line} · waiting ${duration(age)}` : b.line
      break
    }
    case 'done':
      look.eyes = 'happy'
      if (age < 6_000) {
        look.dy = HOP[t % 4]
        look.arms = t % 4 < 2 ? 'up' : 'down'
      }
      if (age < 20_000) look.particles.push('sparkles')
      scene.mood = 'done'
      scene.main = 'Done!'
      scene.sub = b.line
      scene.color = GREEN
      break
    case 'compacting':
      look.squish = [0, 1, 2, 1][t % 4]
      scene.mood = 'compacting'
      scene.main = 'Compacting'
      scene.sub = 'squeezing context'
      scene.color = BLUE
      break
    case 'idle':
      scene.mood = 'idle'
      look.eyes = t % 16 === 0 ? 'closed' : 'open'
      look.eyeDx = [0, 0, -1, -1, 0, 0, 1, 1][Math.floor(t / 4) % 8]
      if (hol && Math.floor(t / 16) % 2 === 1) {
        const [a, c] = holidayText(hol, l)
        scene.main = a
        scene.sub = c
        scene.color = ORANGE
      } else {
        scene.main = clock(l)
        scene.sub = `${tools} tools today`
        scene.isMainDim = true
      }
      break
    case 'sleep':
      scene.mood = 'sleeping'
      look.eyes = 'closed'
      look.particles.push('zzz')
      look.dim = isNight ? 0.3 : 0.5
      scene.main = clock(l)
      scene.sub = 'zzz…'
      scene.isMainDim = true
      break
  }

  // reactions sit on top for a few seconds
  const isReacting =
    r !== null &&
    now < r.until &&
    (r.kind === 'loved' ||
      ((r.kind === 'hmm' || r.kind === 'fit') && s.tantrums) ||
      ((r.kind === 'oops' || r.kind === 'testsFail' || r.kind === 'testsPass') && s.reactions))
  if (isReacting && r) {
    look.dim = 1
    look.particles = look.particles.filter(p => p === 'snow' || p === 'petals' || p === 'leaves')
    look.isIconBlinking = false
    scene.border = undefined
    scene.isMainDim = false
    switch (r.kind) {
      case 'oops':
        look.eyes = 'x'
        look.dx = [0, -1, 1, 0][t % 4]
        look.icon = 'cross'
        scene.mood = 'error'
        scene.main = 'Oops'
        scene.sub = r.line
        scene.color = RED
        break
      case 'testsFail':
        look.eyes = 'x'
        look.icon = 'cross'
        look.particles.push('drop')
        scene.mood = 'error'
        scene.main = 'Tests failed'
        scene.sub = r.line
        scene.color = RED
        break
      case 'testsPass':
        look.eyes = 'happy'
        look.arms = 'up'
        look.dy = HOP[t % 4]
        look.icon = 'check'
        look.particles.push('confetti')
        scene.mood = 'done'
        scene.main = 'Tests pass!'
        scene.sub = r.line
        scene.color = GREEN
        break
      case 'loved':
        look.eyes = 'happy'
        look.dy = HOP[t % 4]
        look.icon = undefined
        look.particles.push('hearts')
        scene.main = r.line
        scene.mood = 'done'
        scene.sub = 'Clawd · loved'
        scene.color = undefined
        break
      case 'hmm':
        look.eyes = 'angry'
        look.eyeDx = -1
        look.icon = undefined
        scene.mood = 'thinking'
        scene.main = 'Hmm…'
        scene.sub = r.line
        scene.color = AMBER
        break
      case 'fit':
        look.eyes = 'angry'
        look.dx = [0, -1, 1, 0][t % 4]
        look.legs = 'stomp'
        look.arms = 'up'
        look.icon = undefined
        look.particles.push('steam')
        scene.mood = 'error'
        scene.border = t % 2 === 0 ? RED : '#7a2020'
        scene.main = t % 8 < 4 ? 'FIX IT?!' : 'deep breaths…'
        scene.sub = r.line
        scene.color = RED
        break
    }
  }

  // moods: time of day, season, holidays
  if (s.moods) {
    const sea = season(l, s.hemisphere)
    const holidayHat: Partial<Record<Holiday, Hat>> = {
      xmas: 'santa',
      newyear: 'party',
      bday: 'party',
      halloween: 'witch',
    }
    look.hat =
      (hol && holidayHat[hol]) ??
      (isNight ? 'nightcap' : sea === 'winter' ? 'beanie' : sea === 'spring' ? 'flower' : undefined)
    look.hasPajamas = isNight
    look.hasFlag = hol === 'swiss'
    look.hasMug = l.hour >= 6 && l.hour < 10 && !look.hasFlag
    look.hasSun = sea === 'summer' && l.hour >= 7 && l.hour < 20 && !look.hasFlag
    look.hasGlasses = sea === 'summer' && l.hour >= 11 && l.hour < 17
    const weather: Particle[] = []
    if (sea === 'winter' || hol === 'xmas') weather.push('snow')
    else if (sea === 'spring') weather.push('petals')
    else if (sea === 'autumn') weather.push('leaves')
    if ((hol === 'newyear' && (l.hour >= 20 || l.hour < 6)) || (hol === 'swiss' && l.hour >= 20)) {
      weather.push('fireworks')
    }
    look.particles = [...weather, ...look.particles.filter(p => !weather.includes(p))]
    look.isFlipped = hol === 'april' && kind === 'idle' && !isReacting
    if (kind === 'sleep' && isNight) look.dim = 0.3
  }

  return scene
}

// ---------------------------------------------------------------- demo

type Demo = {
  label: string
  base: [BaseKind, string, string, number?]
  reaction?: [ReactionKind, string]
  local?: Partial<Local>
}

const DEMOS: Demo[] = [
  { label: 'Hi', base: ['hi', '', ''] },
  { label: 'Thinking', base: ['thinking', 'Noodling…', ''] },
  { label: 'Working · terminal', base: ['working', '$ flutter test', 'Bash'] },
  { label: 'Working · pencil', base: ['working', 'editing main.dart', 'Edit'] },
  { label: 'Working · magnifier', base: ['working', 'reading pubspec.yaml', 'Read'] },
  { label: 'Working · globe', base: ['working', 'claude.dev/blog', 'WebFetch'] },
  { label: 'Working · mini-Clawd', base: ['working', 'calling in a friend', 'Agent'] },
  { label: 'Working · bolt', base: ['working', 'pixellab · create_character', 'mcp__pixellab__create_character'] },
  { label: 'Needs you · permission', base: ['needs', 'Bash wants to run', 'permission'] },
  { label: 'Needs you · question', base: ['needs', 'Claude has a question', 'question'] },
  { label: 'Needs you · plan', base: ['needs', 'plan is ready for review', 'plan'] },
  { label: 'Needs you · impatient', base: ['needs', 'Bash wants to run', 'permission', 25_000] },
  { label: 'Done', base: ['done', '3m 12s · 14 tools', ''] },
  { label: 'Compacting', base: ['compacting', '', ''] },
  { label: 'Idle', base: ['idle', '', ''], local: { month: 10, day: 3, hour: 15 } },
  { label: 'Sleep', base: ['idle', '', '', 700_000], local: { month: 10, day: 3, hour: 15 } },
  { label: 'Oops', base: ['working', '', 'Bash'], reaction: ['oops', 'Bash failed'] },
  { label: 'Tests failed', base: ['working', '', 'Bash'], reaction: ['testsFail', '12 passed, 2 failed'] },
  { label: 'Tests pass', base: ['working', '', 'Bash'], reaction: ['testsPass', '42 passed'] },
  { label: 'Loved', base: ['idle', '', ''], reaction: ['loved', '♥ ♥ ♥'] },
  { label: 'Tantrum · hmm', base: ['thinking', 'Mulling…', ''], reaction: ['hmm', 'that is twice now…'] },
  { label: 'Tantrum · fit', base: ['thinking', 'Mulling…', ''], reaction: ['fit', 'WHY IS IT STILL BROKEN'] },
  { label: 'Morning', base: ['idle', '', ''], local: { month: 10, day: 3, hour: 8 } },
  { label: 'Night', base: ['idle', '', ''], local: { month: 10, day: 3, hour: 23 } },
  { label: 'Night · asleep', base: ['idle', '', '', 700_000], local: { month: 10, day: 3, hour: 23 } },
  { label: 'Winter', base: ['idle', '', ''], local: { month: 1, day: 15, hour: 14 } },
  { label: 'Spring', base: ['idle', '', ''], local: { month: 4, day: 15, hour: 14 } },
  { label: 'Summer', base: ['idle', '', ''], local: { month: 7, day: 15, hour: 14 } },
  { label: 'Autumn', base: ['idle', '', ''], local: { month: 10, day: 10, hour: 14 } },
  { label: 'Xmas', base: ['idle', '', ''], local: { month: 12, day: 24, hour: 15 } },
  { label: 'New Year', base: ['idle', '', ''], local: { month: 12, day: 31, hour: 22 } },
  { label: '1. August', base: ['idle', '', ''], local: { month: 8, day: 1, hour: 21 } },
  { label: 'Halloween', base: ['idle', '', ''], local: { month: 10, day: 31, hour: 15 } },
  { label: 'April fools', base: ['idle', '', ''], local: { month: 4, day: 1, hour: 15 } },
  { label: 'Clawd bday', base: ['idle', '', ''], local: { month: 2, day: 24, hour: 15 } },
]
const DEMO_MS = 3_500

// ---------------------------------------------------------------- hooks

const TOOLS_KEY = 'tools-today'

// what the band shows at tick t: shared by the render and by onTick, which works out whether the desktop changed
async function viewAt($: Dollar, s: Settings, t: number) {
  const now = await $.clock.now()
  let b = await read($, base)
  let r = await read($, reaction)
  let l = localTime(now)
  const counted = await read($, toolsToday)
  const tools = counted.date === dateKey(l) ? counted.count : 0
  let effective = s
  let demoLabel = ''

  const start = await read($, demoStart)
  const index = start === null ? -1 : Math.floor((now - start) / DEMO_MS)
  if (index >= 0 && index < DEMOS.length) {
    const d = DEMOS[index]
    const [kind, line, detail, age = 0] = d.base
    b = { kind, line, detail, since: now - age }
    r = d.reaction ? { kind: d.reaction[0], line: d.reaction[1], until: now + 1_000 } : null
    l = { ...l, minute: 0, ...d.local }
    effective = { ...s, moods: true, reactions: true, tantrums: true }
    demoLabel = `demo ${index + 1}/${DEMOS.length} · ${d.label}`
  }

  const scene = compose(b, r, effective, l, now, t, tools)
  const pet = petAnim(scene.mood, now)
  const note = compactNote && Date.now() - compactNote.at < 15_000 ? compactNote.text : ''
  const clockNow = [demoLabel ? '' : turnClock(now), demoLabel ? '' : cacheClock(now), note].filter(Boolean).join(' · ')
  const withClock = clockNow ? (scene.sub ? `${scene.sub} · ${clockNow}` : clockNow) : scene.sub
  const sub = demoLabel ? `${withClock ? withClock + '  ·  ' : ''}${demoLabel}` : withClock
  return { now, scene, pet, sub }
}

// what the desktop drew last; a module variable, so a reload draws once afresh
let deskSig = ''

async function onTick($: Dollar) {
  const s = await read($, settings)
  if (s.isHidden) return
  await update($, tick, t => (t + 1) % 100_000)
  // the desktop's pet animates itself in its Client: redraw it only when its text, colours, pet or meters change
  const t = await read($, tick)
  const v = await viewAt($, s, t)
  metersFor(v.now)
  const sig = JSON.stringify([v.scene.main, v.scene.sub, v.sub, v.scene.color, v.scene.border, v.scene.isMainDim, v.pet.anim, metersKey, info.working, info.waiting, repos.length > 0])
  if (sig !== deskSig) {
    deskSig = sig
    await update($, deskTick, () => t)
  }
  const start = await read($, demoStart)
  if (start !== null && (await $.clock.now()) - start > DEMOS.length * DEMO_MS) {
    await update($, demoStart, () => null)
  }
}

async function pet($: Dollar) {
  await react($, 'loved', pick(PET_REPLIES), 4_000)
}

export const register: Register = on => {
  let isTurnRunning = false
  let turnStartedAt = 0
  let turnTools = 0
  let frustrations: number[] = []
  let toolsInFlight = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clawd',
      description: 'Clawd: on/off, demo, moods|reactions|tantrums on|off, hemisphere north|south',
    })
    const saved = (await $.store.get(SETTINGS_KEY)) as Partial<Settings> | undefined
    if (saved) await update($, settings, s => ({ ...s, ...saved }))
    const tools = (await $.store.get(TOOLS_KEY)) as ToolsToday | undefined
    if (tools) await update($, toolsToday, () => tools)
    await setBase($, 'hi')
    $.clock.every(250, () => void onTick($))
    await refresh($, true)
    // limits and reset countdowns move while idle too; during a turn turn.start's ticker reads them
    $.clock.every(60_000, () => void (info.working ? undefined : refresh($)))

    return next(e)
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().toLowerCase().split(/\s+/)
    const onOff = (v: string) => v !== 'off' && v !== 'false' && v !== '0'

    if (word === '') {
      const hidden = !(await read($, settings)).isHidden
      await saveSettings($, { isHidden: hidden })
      return { text: hidden ? 'Clawd went to nap.' : 'Clawd is back.' }
    }
    if (word === 'on' || word === 'off') {
      await saveSettings($, { isHidden: word === 'off' })
      return { text: word === 'off' ? 'Clawd went to nap.' : 'Clawd is back.' }
    }
    if (word === 'demo') {
      if (value === 'stop') {
        await update($, demoStart, () => null)
        return { text: 'Demo stopped.' }
      }
      await saveSettings($, { isHidden: false })
      const start = await $.clock.now()
      await update($, demoStart, () => start)
      return {
        text: `Clawd demo: ${DEMOS.length} looks, ${DEMO_MS / 1000}s each. /clawd demo stop ends it.`,
      }
    }
    if (word === 'moods' || word === 'reactions' || word === 'tantrums') {
      await saveSettings($, { [word]: onOff(value) })
      return { text: `Clawd ${word}: ${onOff(value) ? 'on' : 'off'}` }
    }
    if (word === 'hemisphere' && (value === 'north' || value === 'south')) {
      await saveSettings($, { hemisphere: value })
      return { text: `Clawd seasons: ${value}ern hemisphere` }
    }
    const s = await read($, settings)
    return {
      text: [
        '/clawd                     show or hide',
        '/clawd demo [stop]         walk through every look',
        `/clawd moods on|off        seasons, holidays, time of day (${s.moods ? 'on' : 'off'})`,
        `/clawd reactions on|off    oops and test results (${s.reactions ? 'on' : 'off'})`,
        `/clawd tantrums on|off     Clawd judges your frustration (${s.tantrums ? 'on' : 'off'})`,
        `/clawd hemisphere north|south  (${s.hemisphere})`,
      ].join('\n'),
    }
  })

  let ticker: { cancel: () => void } | null = null
  on('turn.start', async ($, e, next) => {
    if (e.agentId) return next(e)
    info = { ...info, working: true, turnAt: await $.clock.now() }
    ctxShown = info.ctx?.tokens ?? null
    runTokens = 0
    ticker?.cancel()
    ticker = $.clock.every(5000, async () => {
      await refresh($)
      noteCtx(await $.clock.now())
    })
    return next(e)
  })

  // each model call of the main turn: add what it burned, and re-read the context so its growth floats up live
  on('turn.step', async function* ($, e, next) {
    const sentAt = e.agentId ? 0 : await $.clock.now()
    const stream = next(e)
    for await (const chunk of stream) {
      if (!e.agentId) isReplying = chunk.kind === 'text' ? true : chunk.kind === 'thinking' || chunk.kind === 'tool' ? false : isReplying
      yield chunk
    }
    const r = await stream.result
    if (!e.agentId) isReplying = false
    if (!e.agentId && r.usage) {
      afterCompact = false
      const u = r.usage
      if (u.ephemeral_1h_input_tokens) cacheTtlMs = 3_600_000
      else if (u.ephemeral_5m_input_tokens) cacheTtlMs = 300_000
      if (u.cache_creation_input_tokens || u.cache_read_input_tokens) cacheAt = sentAt
      runTokens += u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens
      await refresh($)
      noteCtx(await $.clock.now())
    }
    return r
  })

  on('session.measure', async ($, e, next) => {
    await refresh($, e.changed.includes('context') && !info.working)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    setWaiting(false)
    if (e.text.trim().startsWith('/')) return next(e)
    isTurnRunning = true
    turnStartedAt = await $.clock.now()
    turnTools = 0
    await setBase($, 'thinking', pick(VERBS))

    if (isFrustrated(e.text)) {
      const now = await $.clock.now()
      frustrations = [...frustrations.filter(at => now - at < 1_200_000), now]
      if (frustrations.length === 2) await react($, 'hmm', pick(HMM_LINES), 4_000)
      if (frustrations.length >= 3) await react($, 'fit', pick(FIT_LINES), 5_000)
    }

    return next(e)
  })

  // only when a real permission dialog shows up, so bypass / auto modes stay quiet
  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.permission_mode !== 'bypassPermissions') {
      setWaiting(true)
      await setBase($, 'needs', `${e.tool_name.replace(/^mcp__/, '')} wants to run`, 'permission')
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    if (!e.agentId) turnTools++

    if (e.tool === 'AskUserQuestion') await setBase($, 'needs', 'Claude has a question', 'question')
    else if (e.tool === 'ExitPlanMode') await setBase($, 'needs', 'plan is ready for review', 'plan')
    else await setBase($, 'working', lineFor(e.tool, input), e.tool)
    if (e.tool === 'AskUserQuestion' || e.tool === 'ExitPlanMode') setWaiting(true)

    toolsInFlight++
    const ran = await next(e).finally(() => {
      toolsInFlight = Math.max(0, toolsInFlight - 1)
      setWaiting(false)
    })

    const now = await $.clock.now()
    const today = dateKey(localTime(now))
    await update($, toolsToday, t =>
      t.date === today ? { date: today, count: t.count + 1 } : { date: today, count: 1 },
    )
    void $.store.set(TOOLS_KEY, await read($, toolsToday))

    const command = String(input.command ?? '')
    const isTest =
      (e.tool === 'Bash' || e.tool === 'PowerShell') && TEST_CMD.test(command) && !INSTALL_CMD.test(command)
    if (ran.deny !== undefined) {
      await react($, 'oops', `${e.tool} not allowed`, 2_200)
    } else if (isTest) {
      const out = JSON.stringify(ran.result ?? '')
      const verdict = testSummary(out) ?? { isFail: ran.isError === true, summary: cut(command, 40) }
      await react($, verdict.isFail || ran.isError ? 'testsFail' : 'testsPass', verdict.summary, 3_500)
    } else if (ran.isError) {
      await react($, 'oops', `${e.tool.replace(/^mcp__/, '')} failed`, 2_200)
    }

    // with parallel tools, stay on working until the last one is back
    if (isTurnRunning && toolsInFlight === 0) await setBase($, 'thinking', pick(VERBS))
    return ran
  })

  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    await setBase($, 'compacting')
    const result = await next(e)
    if (result.messages) {
      afterCompact = true
      cacheAt = null // the compacted prompt starts a new cache
      if (info.ctx && result.tokensAfter !== undefined) {
        const max = info.ctx.max || info.ctx.window
        info = { ...info, ctx: { ...info.ctx, tokens: result.tokensAfter, pct: Math.round((result.tokensAfter / max) * 100), cats: [] } }
      }
    }
    await refresh($, true)
    noteCtx(await $.clock.now())
    if (isTurnRunning) await setBase($, 'thinking', pick(VERBS))
    else await setBase($, 'idle')
    return result
  })

  on('turn.complete', async ($, e, next) => {
    // a subagent finishing is not the main turn finishing
    if (e.agentId) return next(e)
    isTurnRunning = false
    toolsInFlight = 0
    ticker?.cancel()
    ticker = null
    const ended = await $.clock.now()
    info = { ...info, working: false, waiting: false, endAt: ended, lastMs: e.durationMs > 0 ? e.durationMs : ended - info.turnAt }
    const u = e.usage
    lastTokens = u ? u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens : null
    await refresh($, true)
    noteCtx(ended)
    if (e.isAborted || e.reason === 'aborted') {
      await setBase($, 'idle')
      return next(e)
    }
    if (e.reason === 'error' || e.reason === 'refusal') {
      await setBase($, 'idle')
      await react($, 'oops', e.reason === 'error' ? 'the turn ended with an error' : 'claude refused that one', 2_200)
      return next(e)
    }
    const ms = e.durationMs > 0 ? e.durationMs : (await $.clock.now()) - turnStartedAt
    const burned = lastTokens ? ` · ${k(lastTokens)} tok` : ''
    await setBase($, 'done', `${duration(ms)} · ${turnTools} tool${turnTools === 1 ? '' : 's'}${burned}`)
    return next(e)
  })

  // Compact: runs the /compact command, not awaited, so the hook returns at once (a compaction runs longer
  // than the 30 s a hook may hold $ for, which is how $.session.compact() from a press failed)
  on('ui.press', { plugin: 'clawd-combo', element: 'compact' }, async ($, e) => {
    noteCompact('compacting…')
    void $.command
      .run({ command: 'compact' })
      .catch((err: unknown) => noteCompact(`compact failed: ${err instanceof Error ? err.message : String(err)}`))
    return { element: e.element }
  })

  // ⎇ opens or closes the rows; a repo in the first opens its branches, a branch switches that repo to it
  on('ui.press', { plugin: 'clawd-combo' }, async ($, e, next) => {
    const el = e.element
    if (el !== 'branch' && el !== 'branch-back' && !el.startsWith('repo:') && !el.startsWith('branch:')) return next(e)
    const open = await read($, branchMenu)
    const show = async (menu: BranchMenu | null | undefined) => {
      if (menu === undefined) $.ui.toast('clawd-combo: could not list the branches')
      await update($, branchMenu, () => menu ?? null)
      return { element: el }
    }
    try {
      if (el === 'branch') {
        if (open) return show(null)
        await findRepos($)
        if (!repos.length) {
          $.ui.toast('No git repo in this folder')
          return show(null)
        }
        return show(repos.length === 1 ? (await branchList($, repos[0]!, false)) ?? undefined : await folderMenu($))
      }
      if (el === 'branch-back') return show(await folderMenu($))
      if (el.startsWith('repo:')) return show((await branchList($, el.slice('repo:'.length), true)) ?? undefined)
      const name = el.slice('branch:'.length)
      if (!open?.dir || name === open.current) return show(null)
      const dir = open.dir
      const dirty = (await git($, dir, 'status', '--porcelain', '--untracked-files=no')).stdout.split('\n').filter(Boolean).length
      if (dirty) {
        $.ui.toast(`${dirty} uncommitted file${dirty === 1 ? '' : 's'}: commit or stash before switching to ${name}`)
        return { element: el }
      }
      const r = await git($, dir, 'switch', name)
      if (r.exitCode !== 0) {
        $.ui.toast(`git switch ${name} failed: ${(r.stderr.trim().split('\n').pop() ?? '').slice(0, 120)}`)
        return { element: el }
      }
      $.ui.toast(`${await repoName($, dir)} is on ${name} now`)
      return show(null)
    } catch (err) {
      $.ui.toast(`clawd-combo: ${err instanceof Error ? err.message : String(err)}`)
      return { element: el }
    }
  })

  // a click on the pet (pet-client.tsx posts it): another animation of the same mood, handed straight back as the next props
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'pet') return next(e)
    const anim = shufflePet(await $.clock.now())
    return { props: { anim, px: PET_H / 18 / 8 } }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s: Settings = { ...(await read($, settings)) } as Settings
    if (e.props.hasSurvey || s.isHidden) return next(e)

    // the terminal follows every tick (its pet is drawn here); the desktop only the ticks that change what it shows,
    // so its native Compact button is not rebuilt 4 times a second (that was the hover flicker)
    const t = e.surface === 'terminal' ? await read($, tick) : await read($, deskTick)
    // the branch rows: read always (its writes redraw the band), shown only between turns where there is a repo
    // (a menu of the old shape, from before a reload, counts as closed)
    const hasRepo = repos.length > 0
    const openMenu = await read($, branchMenu)
    const isBranchShown = hasRepo && !info.working
    const menu = isBranchShown && openMenu?.items ? openMenu : null
    const { now, scene, pet, sub } = await viewAt($, s, t)

    if (e.surface === 'terminal') {
      const { Box, Text, Button, Raster } = $.ui.resolve(e)
      const isRoomy = e.props.bodyColumns >= 64 && e.props.maxRows >= 9
      void isRoomy
      const art = { columns: PET_COLUMNS, rows: PET_ROWS, cells: petCells(pet.anim, pet.since, now) }
      const row = (
        <Box alignItems="center" gap={2} borderStyle={scene.border ? 'round' : undefined} borderColor={scene.border}>
          <Raster key="clawd" columns={art.columns} rows={art.rows} cells={art.cells} />
          <Box flexDirection="column" flexShrink={1} flexGrow={1}>
            <Text mono color={scene.color} bold={!scene.isMainDim} dimColor={scene.isMainDim} wrap="truncate-end">
              {scene.main}
            </Text>
            <Text mono dimColor wrap="truncate-end">
              {sub}
            </Text>
            <Text mono dimColor wrap="truncate-end">
              {metersText()}
            </Text>
          </Box>
          {/* no Compact while a turn runs: /compact would only queue behind it */}
          {isBranchShown && <Button key="branch" label={BRANCH_ICON} plain onPress={pressBranch} />}
          {!info.working && <Button key="compact" label="compact" plain onPress={pressCompact} />}
        </Box>
      )
      if (!menu) return row
      return (
        <Box flexDirection="column">
          {row}
          <Box key="branches" flexWrap="wrap" gap={2}>
            {menu.items.map(it => (it.isCurrent
              ? <Button key={it.key} label={`● ${it.label}`} plain onPress={pressBranch} />
              : <Button key={it.key} label={it.label} plain dimColor onPress={pressBranch} />))}
          </Box>
        </Box>
      )
    }

    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    const { Client } = $.ui.resolve(e) as Elements['desktop']
    // the app sizes an Svg from its width prop alone (none: 300px), so the meters' width comes from the band's
    // cells (8 CSS px each) less the pet (85), what the cells overcount past the band's own edge, the Compact button and
    // its gap, and the band's right padding (48 together: the bar then ends ~32 px short of the buttons), and in a repo the ⎇ button and its
    // gap (~48; kept while a turn hides it, so the meters never jump); no inner padding.
    // No border here either (a border pads the band and shifts it): needs-you and tantrums speak through the text color
    const meterW = Math.max(300, e.props.bodyColumns * 8 - 48 - PET_W - (hasRepo ? 48 : 0))
    const row = (
      <Box alignItems="center" gap={1} paddingRight={1}>
        {Svg && (
          (Client ? (
            <Client key="pet" module="./pet-client.tsx" props={{ anim: pet.anim, px: PET_H / 18 / 8 }} width={(PET_H / 18 / 8) * 24} height={PET_H / 16} />
          ) : (
            <Svg source={petSvg(pet.anim, now - pet.since)} alt={`Clawd: ${scene.main}`} width={PET_W} height={PET_H} />
          ))
        )}
        {/* minWidth 0 + overflow hidden: the column may shrink below its text, so a long step truncates instead of
            pushing the Compact button out of the band */}
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          {Svg && (
            <Box key="meters" width="100%" flexGrow={1}>
              <Svg source={metersFor(now)} alt={metersText()} width={meterW} height={METER_H} isInteractive />
            </Box>
          )}
          {/* one Text, one row: a long step is cut with an ellipsis at the column's edge */}
          <Text mono size="caption" color={scene.isMainDim ? LABEL : scene.color} weight={scene.isMainDim ? 'regular' : 'bold'} wrap="truncate-end" maxLines={1}>
            {scene.main}
            {sub ? (
              <Text color={LABEL} weight="regular">
                {` · ${sub}`}
              </Text>
            ) : null}
          </Text>
        </Box>
        {/* no Compact while a turn runs: /compact would only queue behind it, and the native button's hover jumped
            with every redraw the turn brings */}
        {isBranchShown && (
          <Box flexShrink={0}>
            <Button key="branch" label={BRANCH_ICON} {...(menu ? { variant: 'primary' as const } : {})} onPress={pressBranch} />
          </Box>
        )}
        {!info.working && (
          <Box flexShrink={0}>
            <Button key="compact" label="Compact" onPress={pressCompact} />
          </Box>
        )}
      </Box>
    )
    if (!menu) return row
    // the repos, or one repo's branches latest first (the current one drawn as the primary button). The desktop
    // leaves a wrapped row's rowGap out, so the rows are cut here, by each button's width as the app draws it
    // (~7.6 px a character plus 24 of chrome, measured), and stacked in a column whose gap matches the one across
    const avail = e.props.bodyColumns * 8 - 56
    const lines: (typeof menu.items)[] = [[]]
    let used = 0
    for (const it of menu.items) {
      const w = it.label.length * 7.6 + 24
      const line = lines[lines.length - 1]!
      if (line.length && used + 13 + w > avail) {
        lines.push([it])
        used = w
      } else {
        line.push(it)
        used += (line.length > 1 ? 13 : 0) + w
      }
    }
    return (
      <Box flexDirection="column" gap={1}>
        {row}
        <Box key="branches" flexDirection="column" gap="md" paddingRight={1}>
          {lines.map((line, n) => (
            <Box key={`branches-${n}`} flexWrap="wrap" gap="sm">
              {line.map(it => (it.isCurrent
                ? <Button key={it.key} label={it.label} variant="primary" onPress={pressBranch} />
                : <Button key={it.key} label={it.label} variant="secondary" onPress={pressBranch} />))}
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
