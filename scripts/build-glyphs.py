#!/usr/bin/env python3
"""Fill hooks/glyphs.ts with digit and % outlines from your local Claude desktop app.

The gauge draws its percentage inside an SVG, which cannot load the app's font, so
this copies the outlines of 0-9 and % from the Anthropic Sans font that ships inside
Claude.app. Nothing leaves your machine, and the result is for your own install:
don't commit the filled file (see README).

    pip install fonttools
    python3 scripts/build-glyphs.py [path/to/AnthropicSans-Romans-Variable.ttf]
"""
import glob
import json
import os
import sys

try:
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
except ImportError:
    sys.exit('fonttools is missing: pip install fonttools')

CANDIDATES = [
    '/Applications/Claude.app/Contents/Resources/fonts/AnthropicSans-Romans-Variable*.ttf',
    os.path.expanduser('~/Applications/Claude.app/Contents/Resources/fonts/AnthropicSans-Romans-Variable*.ttf'),
]


def find_font():
    if len(sys.argv) > 1:
        return sys.argv[1]
    for pattern in CANDIDATES:
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[0]
    sys.exit('Anthropic Sans not found; pass the .ttf path from your Claude app as an argument')


def main():
    path = find_font()
    font = TTFont(path)
    if 'fvar' in font:
        font = instancer.instantiateVariableFont(font, {'wght': 600, 'opsz': 16})
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    out = {}
    for ch in '0123456789%':
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs, lambda v: '%.0f' % v)
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))  # y down, as SVG
        out[ch] = {'d': pen.getCommands(), 'w': glyphs[name].width}

    lines = [
        '// Digit and % outlines from Anthropic Sans (wght 600), the Claude desktop UI font,',
        '// generated locally by scripts/build-glyphs.py. Not for redistribution.',
        f"export const UPM = {font['head'].unitsPerEm}",
        f"export const CAP = {font['OS/2'].sCapHeight}",
        'export const GLYPHS: Record<string, { d: string; w: number }> = {',
        *[f"  {json.dumps(k)}: {{ d: {json.dumps(v['d'])}, w: {v['w']} }}," for k, v in out.items()],
        '}',
    ]
    target = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hooks', 'glyphs.ts')
    with open(target, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'wrote {os.path.normpath(target)} from {path}')


if __name__ == '__main__':
    main()
