import { test, expect } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120 } } as const

test('the band draws on terminal and desktop', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'context-hud', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /Recommended/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Healthy|Compact/ })).toBeDefined()
    await ui.unmount()
  }
})

test('desktop draws the gauge and mascot as Svg', async $ => {
  const ui = await $.ui.mount({ plugin: 'context-hud', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Svg' } as any)).toBeDefined()
  await ui.unmount()
})
