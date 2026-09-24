"""WOFF2 copies of the Space Grotesk TTFs, for the browser (app/layout.tsx).

WHY BOTH FORMATS ARE COMMITTED. `lib/og.tsx` draws the social cards with
Satori, which cannot read WOFF2, so the TTFs stay. The browser gets these
instead: the same outlines, every glyph kept (the naira sign included),
Brotli-compressed by the WOFF2 container rather than gzip over TTF -- about
half the bytes on a font that is preloaded on every page.

Lossless: nothing is subset or hinted differently. The committed files may
differ from a fresh run by a few bytes of container metadata (the fontTools
version); the glyphs and outlines are the same. Re-run after replacing a TTF:  pip install fonttools brotli && python3 scripts/build-web-fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"

for name in ("SpaceGrotesk-Medium", "SpaceGrotesk-Bold"):
    src = FONTS / f"{name}.ttf"
    out = FONTS / f"{name}.woff2"
    font = TTFont(src)
    font.flavor = "woff2"
    font.save(out)
    print(f"{out.name}: {src.stat().st_size} -> {out.stat().st_size} bytes")
