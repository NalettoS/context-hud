// Digit and % outlines for the gauge's percentage, in font units (y down, baseline 0).
//
// Empty by default: the gauge then sets the number in the system font. Run
// `python3 scripts/build-glyphs.py` to fill this file from the Anthropic Sans font
// bundled with your local Claude desktop app, so the number matches the app's type.
// The font is Anthropic's; its outlines are not distributed with this repository.
export const UPM = 2000
export const CAP = 1440
export const GLYPHS: Record<string, { d: string; w: number }> = {}
