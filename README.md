# context-hud

A small HUD that sits above the Claude Code prompt and tells you, at a glance, how full your context window is.

<p align="center"><img src="docs/demo.gif" alt="context-hud in its three stages: Healthy, Compact recommended, Compact now" width="540"></p>

**Left: the model**
- the model the session is running on
- a recommended model for the session (a simple heuristic, see below)

**Right: the context**, read from the right edge inward
- **Context status**: `Healthy`, `Compact recommended` or `Compact now`, plus tokens used out of the window (`108.2k / 200k`)
- **Gauge**: a 270° arc like a phone battery ring, filled with a green → red gradient, the percentage in the middle and three dots below (green, yellow, red) for the current level
- **History**: a sparkline of the context fill at the end of each of the last 12 turns, and how much the last turn added (`▲ +12.4k last turn`)
- **Clawd**, Claude Code's mascot, on its original pixel grid, animated:

| Context | Status | Clawd |
| --- | --- | --- |
| under 65% | Healthy | happy, hopping and blinking |
| 65–79% | Compact recommended | sad, with a falling pixel tear |
| 80% and over | Compact now | angry, shaking, steaming |

In the **desktop app** the gauge and Clawd are drawn as vector graphics (SVG with SMIL animation). In the **terminal** the same layout is drawn with text: a box gauge, coloured dots and the block-character Clawd.

## Requirements

Claude Code **2.1.286 or newer**. The mod is a plugin of *function hooks*, an early-access plugin API that may change between releases.

## Install

Clone the repository somewhere permanent:

```bash
git clone https://github.com/<you>/context-hud.git ~/claude-mods/context-hud
```

**For one terminal session:**

```bash
claude --plugin-dir ~/claude-mods/context-hud
```

**For every session, desktop app included:** add the folder to the `env` block of `~/.claude/settings.json`, then start a new session:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/Users/<you>/claude-mods/context-hud",
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"
  }
}
```

Use an absolute path. Separate several mod folders with `:`.

## Optional: the app's own font for the percentage

The gauge sets its percentage in the system font. To match the Claude desktop app exactly, generate the digit outlines from the Anthropic Sans font that ships inside your local Claude.app:

```bash
pip install fonttools
python3 scripts/build-glyphs.py
```

The font belongs to Anthropic and is not distributed here. The script reads it on your machine and writes `hooks/glyphs.ts` for your own install only. Keep that file out of your commits:

```bash
git update-index --skip-worktree hooks/glyphs.ts
```

## How the numbers are computed

- **Tokens and percentage** come from Claude Code itself (`$.session.usage()`), the same figures as the status line: input tokens of the last response against the model's context window. They appear after the first response of a session or after a compaction.
- **History** records the fill at the end of every turn; `·` marks turns not taken yet.
- **Recommended model** is a heuristic, not an official signal: keep the current model once context is past 75% (compact first), Opus 5.5 after more than 40 tool calls in the session, Sonnet 5.5 otherwise.

## Develop

```bash
claude plugin validate .
claude plugin test .
```

`hooks/register.tsx` is the whole mod; `tests/hud.test.tsx` mounts the HUD on the terminal and desktop surfaces.

## License

MIT, see [LICENSE](LICENSE). Claude, Claude Code and Clawd are Anthropic's; this is an unofficial fan project, not affiliated with or endorsed by Anthropic.
