# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools[woff]==4.60.1"]
# ///
"""Cut the docs site's KK fonts down to what the site renders.

Run by hand from apps/docs, then commit everything it writes:

    uv run scripts/subset-fonts.py          # rebuild the fonts and fonts.css
    uv run scripts/subset-fonts.py --check  # exit 1 if a rerun is needed

This is deliberately not part of `astro build`: the output is committed, so
the build stays a plain copy and the fonts only change when someone looks at
the diff. Rerun it when:

- a source font in src/assets/fonts/source/ changes,
- content starts using a character the KK fonts draw but the subsets dropped
  (`--check` reports these; most new text is ASCII and needs nothing),
- the site starts setting the `ital` axis on an upright face (see FACES) or
  turns on an OpenType feature not listed in FEATURES,
- a character outside CORE starts appearing on most pages, which would make
  most pages download an extended file.

Neither the build nor `--check` catches the last two; they are CSS changes.

Everything the browser reads from the subsets matches the sources exactly:
outlines, advances and kerning at every weight (see `pinned_gvar`), and the
font-wide metrics (see `build`).

Each face is split in two. The core file is preloaded and holds ASCII plus
the punctuation nearly every page renders. The extended file sits behind a
`unicode-range` that lists only what it contains, so the browser downloads it
only on a page that renders one of those characters. Keep both halves in the
same family: a different family between them in the stack (for example a
generated fallback face) would draw extended characters before the real font.

The KK fonts carry no Reserved Font Name, so the subsets keep their names.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src/assets/fonts/source"
OUT = ROOT / "src/assets/fonts"
CSS = ROOT / "src/styles/fonts.css"

# Text the site can render: docs pages plus the component sources and
# registry entries that demos and playgrounds pull strings from.
CONTENT = [
    ROOT / "src",
    ROOT.parent.parent / "packages/react/src",
    ROOT.parent.parent / "packages/registry/src",
]
CONTENT_SUFFIXES = {".astro", ".md", ".mdx", ".ts", ".tsx", ".js", ".mjs", ".json", ".css"}

# Italics come from separate files with ital already fixed, and nothing sets
# the axis on the upright faces, so pin it there. The weight axes stay whole:
# weights in use top out at 700, but trimming KK Sans to 400–700 (about
# 5 KB per core file) re-normalises the axis, which shifts the 2.14 rounding
# of in-between weights and moves some advances and kerning by a unit. Pins
# must be at an axis default, which keeps them exact.
FACES = [
    ("KK Sans", "normal", "KKSansVF", {"ital": 0}),
    ("KK Sans", "italic", "KKSansVF-Italic", {}),
    ("KK Mono", "normal", "KKMono-VF", {"ital": 0}),
    ("KK Mono", "italic", "KKMono-VF-Italic", {}),
]

# Features browsers apply by default, plus any the site turns on. The docs
# set no font-feature-settings, so ss01, ss02, dlig and aalt go.
FEATURES = ["ccmp", "locl", "rvrn", "kern", "mark", "mkmk", "liga", "clig", "calt", "tnum"]

ASCII = set(range(0x20, 0x7F))
# Curly quotes, dashes, ellipsis, the U+2010 hyphen that `hyphens` inserts
# when the primary (core) face has it, no-break space, and the footer's ©.
CORE_PUNCTUATION = {0xA0, 0xA9, 0x2010, 0x2011, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026}
CORE = ASCII | CORE_PUNCTUATION
# Kept whether or not the content uses them yet.
LATIN = set(range(0xA0, 0x180))


def used_codepoints() -> set[int]:
    used: set[int] = set()
    for directory in CONTENT:
        for path in directory.rglob("*"):
            if path.suffix in CONTENT_SUFFIXES and "node_modules" not in path.parts:
                used.update(map(ord, path.read_text(encoding="utf-8", errors="ignore")))
    return used


def pinned_gvar(source: TTFont, pins: dict) -> dict:
    """The source's outline variations with `pins` applied, without rounding.

    The instancer fills in each glyph's omitted (interpolated) deltas and
    rounds them to whole units, which moves points by up to half a unit.
    Pinning an axis at its default needs no new deltas: tuples that peak
    elsewhere on it contribute nothing there, so drop those and keep the
    rest of the sparse originals as they are.
    """
    defaults = {a.axisTag: a.defaultValue for a in source["fvar"].axes}
    for tag, value in pins.items():
        if value != defaults[tag]:
            sys.exit(f"{tag} can only be pinned at its default, {defaults[tag]}")
    variations = {}
    for glyph, tuples in source["gvar"].variations.items():
        variations[glyph] = [
            TupleVariation({tag: r for tag, r in tv.axes.items() if tag not in pins}, tv.coordinates)
            for tv in tuples
            if all(tv.axes.get(tag, (0, 0, 0))[1] == 0 for tag in pins)
        ]
    return variations


def build(source: Path, pins: dict, codepoints: set[int]) -> TTFont:
    font = TTFont(source)
    if pins:
        # The instancer updates fvar, STAT and the kerning variations; gvar
        # is then replaced with the exact version. Round-trip the result:
        # subsetting it in memory trips over gvar's lazy loading.
        instanced = io.BytesIO()
        instancer.instantiateVariableFont(font, pins, optimize=False).save(instanced)
        font = TTFont(instanced)
        font["gvar"].variations = pinned_gvar(TTFont(source), pins)
    options = subset.Options()
    options.layout_features = FEATURES
    options.hinting = False
    options.glyph_names = False
    # BASE is tiny; keep it so baseline alignment can't move.
    options.drop_tables = [t for t in options.drop_tables if t != "BASE"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    # Saving recomputes the font-wide bounding box from the glyphs that are
    # left. Browsers read it for line and overflow metrics, so carry the
    # source's values over to keep layout identical.
    original = TTFont(source)
    font.recalcBBoxes = False
    for field in ("xMin", "yMin", "xMax", "yMax"):
        setattr(font["head"], field, getattr(original["head"], field))
    for field in ("advanceWidthMax", "minLeftSideBearing", "minRightSideBearing", "xMaxExtent"):
        setattr(font["hhea"], field, getattr(original["hhea"], field))
    for field in ("xAvgCharWidth", "ulCodePageRange1", "ulCodePageRange2"):
        setattr(font["OS/2"], field, getattr(original["OS/2"], field))
    font.flavor = "woff2"
    return font


def unicode_range(codepoints: set[int]) -> str:
    ranges: list[str] = []
    points = sorted(codepoints)
    start = prev = points[0]
    for cp in points[1:] + [None]:
        if cp is not None and cp == prev + 1:
            prev = cp
            continue
        ranges.append(f"U+{start:X}" if start == prev else f"U+{start:X}-{prev:X}")
        if cp is not None:
            start = prev = cp
    return ", ".join(ranges)


def plan() -> list[dict]:
    wanted = used_codepoints() | LATIN | CORE
    faces = []
    for family, style, stem, pins in FACES:
        source = SOURCE / f"{stem}.woff2"
        font = TTFont(source)
        cmap = set(font.getBestCmap())
        weight = next(a for a in font["fvar"].axes if a.axisTag == "wght")
        kept = cmap & wanted
        faces.append({
            "family": family, "style": style, "stem": stem, "pins": pins, "source": source,
            "weight": (int(weight.minValue), int(weight.maxValue)),
            "core": kept & CORE, "extended": kept - CORE,
        })
    return faces


def font_face(face: dict, part: str, codepoints: set[int]) -> str:
    low, high = face["weight"]
    return f"""@font-face {{
  font-family: "{face['family']}";
  font-style: {face['style']};
  font-weight: {low} {high};
  font-display: swap;
  src: url("../assets/fonts/{face['stem']}-{part}.woff2") format("woff2");
  unicode-range: {unicode_range(codepoints)};
}}
"""


def fingerprint(face: dict) -> str:
    digest = hashlib.sha256(face["source"].read_bytes()).hexdigest()[:12]
    return f"{face['source'].name} {digest}"


def write() -> None:
    blocks = []
    sources = []
    for face in plan():
        sources.append(fingerprint(face))
        for part in ("core", "extended"):
            font = build(face["source"], face["pins"], face[part])
            # The subsetter must map exactly what was asked for, or the
            # unicode-range below would promise glyphs the file lacks.
            got = set(font.getBestCmap())
            if got != face[part]:
                sys.exit(f"{face['stem']}-{part}: cmap differs by {sorted(got ^ face[part])}")
            buffer = io.BytesIO()
            font.save(buffer)
            path = OUT / f"{face['stem']}-{part}.woff2"
            path.write_bytes(buffer.getvalue())
            print(f"{path.relative_to(ROOT)}  {len(buffer.getvalue()):>6} B  {len(got)} characters")
            blocks.append(font_face(face, part, got))
    CSS.write_text(
        "/* Site-only brand fonts; never distributed in the styles package.\n"
        "   Generated by scripts/subset-fonts.py: edit that, not this file.\n"
        + "".join(f"   Source: {line}\n" for line in sources)
        + "*/\n\n"
        + "\n".join(blocks)
    )


def check() -> int:
    stale = 0
    used = used_codepoints()
    css = CSS.read_text() if CSS.exists() else ""
    for face in plan():
        if f"Source: {fingerprint(face)}" not in css:
            stale += 1
            print(f"{face['source'].name} changed since the subsets were generated")
        kept = set()
        for part in ("core", "extended"):
            path = OUT / f"{face['stem']}-{part}.woff2"
            if path.exists():
                kept |= set(TTFont(path).getBestCmap())
        missing = (face["core"] | face["extended"]) - kept
        if missing:
            stale += 1
            sample = "".join(chr(cp) for cp in sorted(missing & used)[:40])
            print(f"{face['stem']}: {len(missing)} characters missing from the subsets {sample!r}")
    print("Subsets are stale; rerun without --check." if stale else "Subsets cover the content.")
    return 1 if stale else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="report whether a rerun is needed")
    sys.exit(check() if parser.parse_args().check else write())
