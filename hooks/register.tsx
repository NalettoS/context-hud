import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Hud } from '../types'

import { CAP, GLYPHS } from './glyphs'

const hud = atom(
  { plugin: 'context-hud', key: 'hud' } as const,
  { model: '?', tokens: null, window: 200000, percent: null, history: [], tools: 0 } as Hud,
)

const BARS = '▁▂▃▄▅▆▇█'

const GREEN = '#5DB36A'
const YELLOW = '#E0B341'
const RED = '#E06060'
const CLAUDE = '#D97757'

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

type Level = 0 | 1 | 2
// One scale for everything: Healthy (happy, green), Compact recommended (sad, yellow), Compact now (angry, red).
const level = (p: number): Level => (p < 65 ? 0 : p < 80 ? 1 : 2)
const LEVEL_COLOR = [GREEN, YELLOW, RED] as const

const spark = (values: number[], window: number) => {
  const cells = values.slice(-12).map(v => BARS[Math.min(7, Math.max(0, Math.floor((v / window) * 8)))])
  return cells.join('').padStart(12, '·')
}

const recommend = (model: string, percent: number, tools: number) => {
  if (percent >= 75) return model
  return tools > 40 ? 'Opus 5.5' : 'Sonnet 5.5'
}

const THEME = `<style>
  .ink{fill:#2b2b2b} .track{stroke:#d9d9d9}
  @media (prefers-color-scheme: dark){ .ink{fill:#ececec} .track{stroke:#3a3a3a} }
</style>`

// The percentage, centred on (cx, baseline): Anthropic Sans outlines when
// scripts/build-glyphs.py has filled glyphs.ts, the system font otherwise.
const numberPaths = (p: number, cx: number, baseline: number, capPx: number) => {
  const digits = String(Math.round(p))
  if (![...digits, '%'].every(ch => GLYPHS[ch])) {
    const size = capPx / 0.7
    return `<text x="${cx}" y="${baseline}" text-anchor="middle" class="ink" font-family="'Anthropic Sans',-apple-system,system-ui,sans-serif" font-size="${size.toFixed(1)}" font-weight="600">${digits}<tspan font-size="${(size * 0.55).toFixed(1)}" dy="${(-capPx * 0.45).toFixed(1)}">%</tspan></text>`
  }
  const s = capPx / CAP
  const pctS = s * 0.55
  const glyph = (ch: string) => GLYPHS[ch] as { d: string; w: number }
  const width = [...digits].reduce((sum, ch) => sum + glyph(ch).w * s, 0) + glyph('%').w * pctS
  let x = cx - width / 2
  const parts: string[] = []
  for (const ch of digits) {
    parts.push(`<path transform="translate(${x.toFixed(2)} ${baseline}) scale(${s.toFixed(5)})" d="${glyph(ch).d}"/>`)
    x += glyph(ch).w * s
  }
  // % smaller and top-aligned with the digits, like a superscript.
  const pctBase = baseline - capPx + CAP * pctS
  parts.push(`<path transform="translate(${x.toFixed(2)} ${pctBase.toFixed(2)}) scale(${pctS.toFixed(5)})" d="${glyph('%').d}"/>`)
  return `<g class="ink">${parts.join('')}</g>`
}

// Open arc like a phone battery ring: 270°, gap at the bottom, three dots in the gap.
const gaugeSvg = (p: number) => {
  const lv = level(p)
  const arc = 'M 23.13 76.87 A 38 38 0 1 1 76.87 76.87'
  const used = Math.max(0, Math.min(100, p))
  const dots = [0, 1, 2]
    .map(i => {
      const on = i === lv
      return `<circle cx="${38 + i * 12}" cy="90" r="4.5" fill="${on ? LEVEL_COLOR[i] : '#8a8a8a'}" opacity="${on ? 1 : 0.3}"/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${THEME}
  <path d="${arc}" class="track" fill="none" stroke-width="8" stroke-linecap="round"/>
  <defs><linearGradient id="ctx-grad" gradientUnits="userSpaceOnUse" x1="12" y1="0" x2="88" y2="0">
    <stop offset="0" stop-color="${GREEN}"/><stop offset="0.5" stop-color="${YELLOW}"/><stop offset="1" stop-color="${RED}"/>
  </linearGradient></defs>
  <path d="${arc}" fill="none" stroke="url(#ctx-grad)" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="${used} 100"/>
  ${numberPaths(p, 50, 59, 19)}
  ${dots}
</svg>`
}

// Clawd, Claude Code's mascot, on its original pixel grid (16 x 10 cells):
// body cols 2-13 rows 0-7, arms rows 4-5, four legs rows 8-9, eyes cut out of the body.
const px = (x: number, y: number, w = 1, h = 1, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${extra}/>`

const mascotSvg = (p: number) => {
  const lv = level(p)
  const body = [CLAUDE, '#C4927C', '#D9573F'][lv]
  const step = (values: string, dur: string, attr = 'transform', type = 'translate') =>
    attr === 'transform'
      ? `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" calcMode="discrete" repeatCount="indefinite"/>`
      : `<animate attributeName="${attr}" values="${values}" dur="${dur}" calcMode="discrete" repeatCount="indefinite"/>`

  // Eye holes (black in the mask = cut out). Happy: the original 1x2 eyes, blinking.
  const blinkY = '2;2;2;2;2;2;2;3;2'
  const blinkH = '2;2;2;2;2;2;2;0.5;2'
  const eyes = [
    `<rect x="4" y="2" width="1" height="2">${step(blinkY, '3.6s', 'y')}${step(blinkH, '3.6s', 'height')}</rect>
     <rect x="11" y="2" width="1" height="2">${step(blinkY, '3.6s', 'y')}${step(blinkH, '3.6s', 'height')}</rect>`,
    // sad: inner corners up
    px(5, 2) + px(4, 3, 2, 1) + px(10, 2) + px(10, 3, 2, 1),
    // angry: inner corners down
    px(4, 2) + px(4, 3, 2, 1) + px(11, 2) + px(10, 3, 2, 1),
  ][lv]

  const motion = [
    step('0 0;0 -1', '0.7s'), // hop
    step('0 0;0 0.5', '2.4s'), // slump
    step('-0.4 0;0.4 0', '0.18s'), // shake
  ][lv]

  const armL = lv === 0 ? `<rect x="0" y="4" width="2" height="2">${step('4;3', '0.7s', 'y')}</rect>` : px(0, lv === 1 ? 5 : 4, 2, 2)
  const armR = lv === 0 ? `<rect x="14" y="4" width="2" height="2">${step('3;4', '0.7s', 'y')}</rect>` : px(14, lv === 1 ? 5 : 4, 2, 2)

  const extras = [
    '',
    // a pixel tear falling from the left eye
    `<rect x="4" y="4" width="1" height="1" fill="#6FB7F2">${step('4;5;6;7', '1.6s', 'y')}${step('1;1;1;0', '1.6s', 'opacity')}</rect>`,
    // pixel steam rising from the head
    `<g fill="#9a9a9a">
       <rect x="3" y="-1" width="1" height="1">${step('-1;-2;-3', '0.9s', 'y')}${step('1;0.6;0', '0.9s', 'opacity')}</rect>
       <rect x="12" y="-2" width="1" height="1">${step('-2;-3;-1', '0.9s', 'y')}${step('0.6;0;1', '0.9s', 'opacity')}</rect>
     </g>`,
  ][lv]

  return `<svg xmlns="http://www.w3.org/2000/svg" style="background:transparent;color-scheme:light dark" viewBox="-0.5 -3.5 17 14" width="170" height="140" shape-rendering="crispEdges">
  <style>:root{color-scheme:light dark;background:transparent}</style>
  <defs><mask id="clawd-${lv}" maskUnits="userSpaceOnUse" x="-1" y="-4" width="18" height="15">
    <rect x="-1" y="-4" width="18" height="15" fill="#fff"/>
    <g fill="#000">${eyes}</g>
  </mask></defs>
  <g>${motion}
    <g fill="${body}">
      <g mask="url(#clawd-${lv})">${px(2, 0, 12, 8)}</g>
      ${armL}${armR}
      ${px(3, 8, 1, 2)}${px(5, 8, 1, 2)}${px(10, 8, 1, 2)}${px(12, 8, 1, 2)}
    </g>
    ${extras}
  </g>
</svg>`
}

// Outline of the text gauge, clockwise from the top-left corner (terminal fallback).
const W = 7
const RING = [...'╭─────╮'.split(''), '│', ...'╯─────╰'.split(''), '│']

async function refresh($: any) {
  const [usage, model] = await Promise.all([$.session.usage(), $.session.model()])
  await update($, hud, (x: Hud) => ({
    ...x,
    model,
    tokens: usage.context.tokens ?? x.tokens,
    window: usage.context.window,
    percent: usage.context.percent ?? x.percent,
  }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await update($, hud, (x: Hud) => ({ ...x, tools: x.tools + 1 }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    const st = await read($, hud)
    if (st.tokens !== null) {
      await update($, hud, (x: Hud) => ({ ...x, history: [...x.history, st.tokens as number].slice(-12) }))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const st = await read($, hud)
    const els: any = $.ui.resolve(e)
    const { Box, Text } = els
    const Svg = els.Svg

    const p = st.percent ?? 0
    const lv = level(p)
    const color = LEVEL_COLOR[lv]
    const n = st.history.length
    const delta = n >= 2 ? (st.history[n - 1] as number) - (st.history[n - 2] as number) : (st.history[0] ?? 0)

    const modelCol = (
      <Box flexDirection="column" width={26}>
        <Text dimColor>Model</Text>
        <Text bold>{st.model}</Text>
        <Text dimColor>Recommended: {recommend(st.model, p, st.tools)}</Text>
      </Box>
    )

    // Mirror of the model column, right-aligned at the far right.
    const contextCol = (
      <Box flexDirection="column" alignItems="flex-end">
        <Text dimColor>Context</Text>
        <Text bold color={color}>
          {['Healthy', 'Compact recommended', 'Compact now'][lv]}
        </Text>
        <Text>
          <Text bold>{st.tokens === null ? '–' : fmt(st.tokens)}</Text>
          <Text dimColor> / {fmt(st.window)}</Text>
        </Text>
      </Box>
    )

    const dataCol = (
      <Box flexDirection="column" alignItems="flex-end">
        <Text dimColor>last 12 turns</Text>
        <Text color={CLAUDE}>{spark(st.history, st.window)}</Text>
        <Text dimColor>
          {delta >= 0 ? '▲ +' : '▼ -'}
          {fmt(Math.abs(delta))} last turn
        </Text>
      </Box>
    )

    // Left to right: model ... mascot, data, gauge, context title (read from the right edge inward).
    if (Svg) {
      return (
        <Box flexDirection="row" alignItems="center" paddingX={1}>
          {modelCol}
          <Box flexGrow={1} />
          <Box flexDirection="row" alignItems="center" gap={2}>
            <Svg source={mascotSvg(p)} alt="Claude mascot" width={44} height={36} isInteractive />
            {dataCol}
            <Svg source={gaugeSvg(p)} alt={`Context ${Math.round(p)}% used`} width={56} height={56} />
            {contextCol}
          </Box>
        </Box>
      )
    }

    // Terminal: text gauge, three level dots, block mascot.
    const lit = Math.round((Math.min(100, p) / 100) * RING.length)
    const cell = (index: number) => {
      const filled = index < lit
      return (
        <Text key={String(index)} color={filled ? color : undefined} dimColor={!filled}>
          {RING[index]}
        </Text>
      )
    }
    const inner = `${Math.round(p)}%`
    const room = Math.max(0, W - 2 - inner.length)
    const centered = ' '.repeat(Math.ceil(room / 2)) + inner + ' '.repeat(Math.floor(room / 2))
    const eyes = [['▛', '▜'], ['▙', '▟'], ['▜', '▛']][lv] as string[]

    return (
      <Box flexDirection="row" paddingX={1}>
        {modelCol}
        <Box flexGrow={1} />
        <Box flexDirection="row" gap={2}>
          <Box flexDirection="column" width={10}>
            <Text color={CLAUDE}>{` ▐${eyes[0]}███${eyes[1]}▌ `}</Text>
            <Text color={CLAUDE}>▝▜█████▛▘</Text>
            <Text color={CLAUDE}>  ▘▘ ▝▝  </Text>
          </Box>
          {dataCol}
          <Box flexDirection="column" width={W}>
            <Box>{Array.from({ length: W }, (_, i) => cell(i))}</Box>
            <Box>
              <Text color={RING.length - 1 < lit ? color : undefined} dimColor={RING.length - 1 >= lit}>│</Text>
              <Text bold>{centered}</Text>
              <Text color={W < lit ? color : undefined} dimColor={W >= lit}>│</Text>
            </Box>
            <Box>
              <Text> </Text>
              {[0, 1, 2].map(i => (
                <Text key={`d${i}`} color={i === lv ? LEVEL_COLOR[i] : undefined} dimColor={i !== lv}>
                  {i === lv ? '●' : '·'}{' '}
                </Text>
              ))}
            </Box>
          </Box>
          {contextCol}
        </Box>
      </Box>
    )
  })
}
