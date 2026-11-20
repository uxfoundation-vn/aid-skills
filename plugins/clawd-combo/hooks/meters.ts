// The meters row from clawd-bar (clawd-companion, MIT): context and the two usage limits, as one SVG that fills
// its box. Text is fixed in px; the three bars share whatever width is left (CSS calc on the SVG's own width), so
// the row spans the column at any window size. Claude's dark palette. Pure.

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type Cat = { name: string; tokens: number }
export type Burn = { projected: number; fullInMs: number | null; resetInMs: number }
export type Info = {
  ctx: { pct: number; tokens: number; window: number; cats: Cat[]; max: number; compactAt?: number } | null
  limits: { kind: string; pct: number; resetsAt?: string }[]
  burn: Burn | null // the 5-hour window's pace, projected to its reset
  working: boolean
  waiting: boolean // Claude is blocked on the person (a permission prompt, a question)
  nudge: string | null // a quiet wait, no dialog: what Claude waits for the person to do (a file, a key)
  turnAt: number // when the running turn began
  endAt: number | null // when the last turn ended
  lastMs: number | null // how long the last turn took
  flash: { text: string; at: number } | null // the context's change over the last turn, floated once
  limitFlash?: Record<string, { text: string; at: number }> // per limit kind: what was spent since the last float-up
}

// a change floats up from the number once, then fades
const floatUp = (flash: { text: string; at: number } | undefined | null, now: number, color: string) => {
  const age = flash ? now - flash.at : Infinity
  if (!flash || age >= 3200) return undefined
  const begin = `-${(age / 1000).toFixed(3)}s`
  return `<text y="-8" font-size="${cfg.fs}" font-weight="700" ${FONT} fill="${color}" opacity="0" pointer-events="none">${esc(flash.text)}` +
    `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.6;1" dur="3.2s" begin="${begin}" fill="freeze"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 6;0 0" dur="3.2s" begin="${begin}" fill="freeze"/></text>`
}

const C = { text: '#c2c0b6', muted: '#85837c', faint: '#5e5c56', track: '#353432', clay: '#d97757', yellow: '#e8c468', red: '#e5534b', green: '#7ec699' }
// what fills the context window, coloured per /context category
export const CAT_COLOR: Record<string, string> = {
  'System prompt': '#a3a096',
  'System tools': '#6a9bcc',
  'MCP tools': '#9b87f5',
  'Custom agents': '#c792ea',
  'Memory files': '#e0a458',
  Skills: '#5fb3a1',
  'Slash commands': '#7fb4a8',
  Messages: '#d97757',
  'Autocompact buffer': '#4a4843',
}
const EXTRA = ['#b9a37a', '#8fa8c8', '#c78f8f', '#9ab38a']
export const colorOf = (name: string) =>
  CAT_COLOR[name] ?? EXTRA[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % EXTRA.length]!

// one rule for every meter: Claude orange until 75%, yellow from 75%, red from 90%
export const WARN = 75
export const DANGER = 90
export const tone = (p: number) => (p >= DANGER ? C.red : p >= WARN ? C.yellow : C.text)
export const fillOf = (p: number) => (p >= DANGER ? C.red : p >= WARN ? C.yellow : C.clay)

export const k = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
export const span = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${m}m` : m ? `${m}m ${s % 60}s` : `${s}s`
}
const short = (ms: number) => span(ms).replace(/ \d+s$/, '').replace(' ', '') // 1h12m, 40m, 2d3h

// The 5-hour window's pace from readings over the last hour: where it lands at the reset, and when it would
// hit 100% first. Null until there are 4+ minutes of rising readings. Pure, for the tests.
export type Sample = { t: number; pct: number }
export const burnOf = (samples: Sample[], now: number, pct: number, resetsAt?: string): Burn | null => {
  const reset = resetsAt ? Date.parse(resetsAt) - now : NaN
  const first = samples.find(s => now - s.t <= 3_600_000)
  if (!first || !Number.isFinite(reset) || reset <= 0 || now - first.t < 240_000 || pct <= first.pct) return null
  const rate = (pct - first.pct) / (now - first.t) // points per ms
  const toFull = (100 - pct) / rate
  return { projected: Math.min(100, pct + rate * reset), fullInMs: toFull < reset ? toFull : null, resetInMs: reset }
}

// Layout numbers, CSS px. `configure` sets them (the tuning page and the mod share this code).
// One font, one size, two weights: labels bold, values regular.
// bh: the fill's height; pad: the track's padding around it, so the track reads as a box the fill sits in
export type MeterCfg = { fs: number; bh: number; pad: number; gap: number; meterGap: number }
export const DEFAULT_CFG: MeterCfg = { fs: 11, bh: 5, pad: 2, gap: 8, meterGap: 18 }
let cfg: MeterCfg = DEFAULT_CFG
export const configure = (c: Partial<MeterCfg>) => {
  cfg = { ...DEFAULT_CFG, ...c }
}
// one tick for every bar (CTX's auto-compact point, 5H/7D's pace): 2px wide, 3px past the bar each side
const tick = (css: (d: string) => string, y: number, at: string, color: string) =>
  `<rect ${css(`x:calc(${at} - 1px)`)} y="${y - cfg.bh / 2 - 3}" width="2" height="${cfg.bh + 6}" rx="1" fill="${color}"/>`
const FONT = 'font-family="ui-monospace,SF Mono,Menlo,Cascadia Mono,Consolas,monospace"'
const cw = () => cfg.fs * 0.6 // monospace advance
const textW = (t: string) => [...t].length * cw()

// Each meter: label, a track `var(--bar)` long, value. The fill inside the track's padding is drawn by `bar`, given
// helpers that turn a 0–1 fraction of the inner width `var(--in)` into CSS.
type Css = (decl: string) => string
type Meter = { label: string; value: string; valueTone: string; title: string; bar: (css: Css, y: number) => string; flash?: string }

const frac = (f: number) => `calc(var(--in) * ${Math.max(0, Math.min(1, f)).toFixed(4)})`

const ctxMeter = (now: number, ctx: Info['ctx'], flash: Info['flash']): Meter => {
  const { bh } = cfg
  let title = 'Context: no reading yet'
  let bar: Meter['bar'] = () => ''
  if (ctx) {
    // segments per category of what is in the window, sharing a fill measured as /context measures it
    const segs = ctx.cats.filter(c => c.tokens > 0 && ctx.max > 0)
    const reach = ctx.max > 0 ? Math.min(1, ctx.tokens / ctx.max) : Math.min(ctx.pct, 100) / 100
    bar = (css, y) => {
      let fill = ''
      // how far the fill reaches, on /context's scale (the compaction window, the tick's too), not the model's window
      let filled = reach
      if (segs.length) {
        // the categories are read now and then, the % every tick: they only share out the fill, whose length is the %
        const sum = segs.reduce((n, c) => n + c.tokens, 0)
        let at = 0
        for (const c of segs) {
          const w = Math.min(filled - at, (c.tokens / sum) * filled)
          if (w <= 0) break
          fill += `<rect ${css(`x:${frac(at)};width:${frac(w)}`)} y="${y - bh / 2}" height="${bh}" fill="${colorOf(c.name)}"/>`
          at += w
        }
        filled = at
      } else fill = `<rect ${css(`width:${frac(reach)}`)} y="${y - bh / 2}" height="${bh}" fill="${C.clay}"/>`
      let out = `<defs><clipPath id="ctxclip"><rect ${css(`width:max(${bh}px, ${frac(filled)})`)} y="${y - bh / 2}" height="${bh}" rx="${bh / 2}"/></clipPath></defs>` +
        `<g clip-path="url(#ctxclip)">${fill}</g>`
      // where auto-compact kicks in: a tick across the bar
      if (ctx.compactAt && ctx.max > 0 && ctx.compactAt < ctx.max)
        out += tick(css, y, frac(ctx.compactAt / ctx.max), ctx.tokens >= ctx.compactAt * 0.9 ? (ctx.tokens >= ctx.compactAt ? '#d9483b' : '#d97757') : '#3f9b5a')
      return out
    }
    title = `Context ${Math.round(reach * 100)}% · ${k(ctx.tokens)} of ${k(ctx.max || ctx.window)}` +
      (ctx.compactAt ? `\nAuto-compact at ${k(ctx.compactAt)} (the tick)` : '') +
      (segs.length ? '\n\n' + segs.map(c => `${c.name}  ${k(c.tokens)}`).join('\n') : '')
  }
  // the last turn's change floats up from the number once, then fades
  const f = floatUp(flash, now, flash?.text.startsWith('+') ? C.clay : C.green)
  return { label: 'CTX', value: ctx ? k(ctx.tokens) : '—', valueTone: ctx ? 'v' : 'vf', title, bar, ...(f ? { flash: f } : {}) }
}

const limitMeter = (kind: 'five_hour' | 'seven_day', l: Info['limits'][number] | undefined, burn: Burn | null, now: number, flash?: { text: string; at: number }): Meter => {
  const { bh } = cfg
  const long = kind === 'five_hour' ? '5-hour' : 'Weekly'
  const p = l ? Math.min(l.pct, 100) : 0
  const resets = l?.resetsAt ? Date.parse(l.resetsAt) - now : NaN
  const hasReset = Number.isFinite(resets) && resets > 0
  const left = 100 - p // shown as what is left: the bar empties as the window is used
  let title = l ? `${long} limit · ${Math.round(left)}% left (${l.pct}% used)${hasReset ? ` · resets in ${span(resets)}` : ''}` : `${long} limit: no reading yet (shows after the first reply on a subscription)`
  // the pace line: how much of the window's time is left. Quota left above it is on pace, below it burning fast
  const windowMs = kind === 'five_hour' ? 5 * 3_600_000 : 7 * 86_400_000
  const gone = hasReset ? Math.max(0, Math.min(1, 1 - resets / windowMs)) : null
  if (gone !== null) title += `\nPace line: ${Math.round((1 - gone) * 100)}% of the window's time left`
  const bar: Meter['bar'] = (css, y) => {
    let out = l && left > 0 ? `<rect ${css(`width:max(${bh}px, ${frac(left / 100)})`)} y="${y - bh / 2}" height="${bh}" rx="${bh / 2}" fill="${p >= DANGER ? '#d9483b' : '#d97757'}"/>` : ''
    if (gone !== null) out += tick(css, y, frac(1 - gone), p > gone * 100 + 0.5 ? (p >= DANGER ? '#d9483b' : '#d97757') : '#3f9b5a')
    return out
  }
  // 5H reads as the countdown to its reset: →3H, under an hour →42M
  const label = kind === 'seven_day' ? '7D' : !hasReset ? '5H' : resets >= 3_600_000 ? `→${Math.floor(resets / 3_600_000)}H` : `→${Math.max(1, Math.ceil(resets / 60_000))}M`
  // what this window spent since the last float-up rises from the % in orange, as the context's change does
  const f = floatUp(flash, now, C.clay)
  return { label, value: l ? `${Math.round(left)}%` : '—', valueTone: l ? 'v' : 'vf', title, bar, ...(f ? { flash: f } : {}) }
}

// labels faint, numbers a light grey, track a see-through grey, fill orange (red from 90%). One palette that reads
// on light and dark alike: the SVG's own colour-scheme query follows macOS, not the app's mode, so it cannot switch.
// Pace line: green on or under pace, orange over, red over at 90%+
const TRACK = 'rgba(128,126,120,0.28)' // over a light band a pale grey, over a dark one a dark grey
const PALETTE =
  '.lab,.vf{fill:#8a8984}.v{fill:#b0aea5}' // a rect already carries a class for its calc() size, so rects take fill=

// The whole row as one SVG `width="100%"`: labels hug their text, the gaps are fixed, the bars split the rest.
export const metersSvg = (H: number, now: number, i: Info): string => {
  const { bh, pad, gap, meterGap } = cfg
  const rules: string[] = []
  const css: Css = decl => {
    rules.push(`.c${rules.length}{${decl}}`)
    return `class="c${rules.length - 1}"`
  }
  const y = Math.round(H / 2) + 2
  const ms = [
    ctxMeter(now, i.ctx, i.flash),
    limitMeter('five_hour', i.limits.find(l => l.kind === 'five_hour'), i.burn, now, i.limitFlash?.five_hour),
    limitMeter('seven_day', i.limits.find(l => l.kind === 'seven_day'), null, now, i.limitFlash?.seven_day),
  ]
  const valueW = (m: Meter) => textW(m.value)
  const fixed = ms.reduce((n, m) => n + textW(m.label) + gap * 2 + valueW(m), 0) + meterGap * (ms.length - 1) + 2
  let at = 0
  let out = ''
  ms.forEach((m, n) => {
    const lw = textW(m.label)
    const own = lw + gap * 2 + valueW(m)
    const inner =
      `<rect x="-2" y="${y - 13}" height="26" ${css(`width:calc(var(--bar) + ${(own + 4).toFixed(1)}px)`)} fill="transparent"/>` +
      `<text y="${y + 4.5}" font-size="${cfg.fs}" ${FONT} class="lab">${m.label}</text>` +
      `<g ${css(`transform:translateX(${(lw + gap).toFixed(1)}px)`)}>` +
      `<rect ${css('width:var(--bar)')} y="${y - bh / 2 - pad}" height="${bh + pad * 2}" rx="${bh / 2 + pad}" fill="${TRACK}"/>` +
      `<g transform="translate(${pad} 0)">${m.bar(css, y)}</g></g>` +
      `<g ${css(`transform:translateX(calc(var(--bar) + ${(lw + gap * 2).toFixed(1)}px))`)}>` +
      `<text y="${y + 4.5}" font-size="${cfg.fs}" ${FONT} class="${m.valueTone}">${esc(m.value)}</text>` +
      `${m.flash ? `<g transform="translate(0 ${y})">${m.flash}</g>` : ''}</g>`
    out += `<g ${css(`transform:translateX(calc(var(--bar) * ${n} + ${at.toFixed(1)}px))`)}><title>${esc(m.title)}</title>${inner}</g>`
    at += own + meterGap
  })
  const style = `${PALETTE}svg{--bar:max(24px, calc((100% - ${fixed.toFixed(1)}px) / 3));--in:calc(var(--bar) - ${pad * 2}px)}g,rect{transform-box:view-box}${rules.join('')}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${H}" overflow="visible"><style>${style}</style>${out}</svg>`
}
