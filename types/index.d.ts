export type Hud = {
  model: string
  tokens: number | null
  window: number
  percent: number | null
  history: number[]
  tools: number
}

declare module 'claude-code' {
  interface PluginState {
    'context-hud': { hud: Hud }
  }
}
