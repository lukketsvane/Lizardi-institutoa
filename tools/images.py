#!/usr/bin/env python3
"""Turn the original artwork into web-sized images.

    python3 tools/images.py path/to/originals

Expected layout of the originals folder (PNG exports):

    book/01.png, 02.png ...        picture-book spreads, in reading order
    diary/intro-0.png, p20.png ... comic pages, named by the ids in content.json
    sprites/snail-pink.png ...     cut-out drawings with transparency

Writes assets/book, assets/diary, assets/sprites and assets/meta.json
(sizes and edge colours that tools/build.py needs). Existing, up-to-date
outputs are skipped. Needs Pillow >= 11.3 (pip install pillow).
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
BOOK_WIDTHS = (480, 1280, 2400)
PAGE_AVIF_WIDTHS = (800, 1400)
PAGE_WEBP_WIDTH = 1000  # fallback for browsers without AVIF


def stale(src, out):
    return not out.exists() or out.stat().st_mtime < src.stat().st_mtime


def fit(im, width):
    width = min(width, im.width)
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def flatten(im):
    """Composite onto white: a couple of comic pages were exported with transparency."""
    im = im.convert("RGBA")
    bg = Image.new("RGBA", im.size, "white")
    bg.alpha_composite(im)
    return bg.convert("RGB")


def edge_colour(im, x):
    """Most common colour in a thin vertical strip: the page's paper colour."""
    strip = im.crop((x, 0, x + 12, im.height)).quantize(8).convert("RGB")
    r, g, b = max(strip.getcolors(), key=lambda c: c[0])[1]
    return f"#{r:02x}{g:02x}{b:02x}"


def book(src_dir, meta):
    out_dir = ASSETS / "book"
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(src_dir.glob("*.png")):
        im = Image.open(src).convert("RGB")
        meta["book"][src.stem] = {
            "w": im.width, "h": im.height,
            "l": edge_colour(im, 6), "r": edge_colour(im, im.width - 18),
        }
        for w in BOOK_WIDTHS:
            out = out_dir / f"{src.stem}-{w}.webp"
            if stale(src, out):
                fit(im, w).save(out, "WEBP", quality=80, method=6)
                print(out.relative_to(ROOT))


def diary(src_dir, meta):
    out_dir = ASSETS / "diary"
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(src_dir.glob("*.png")):
        jobs = [(out_dir / f"{src.stem}-{w}.avif", w, "AVIF", {"quality": 50, "speed": 4}) for w in PAGE_AVIF_WIDTHS]
        jobs.append((out_dir / f"{src.stem}-{PAGE_WEBP_WIDTH}.webp", PAGE_WEBP_WIDTH, "WEBP", {"quality": 62, "method": 6}))
        with Image.open(src) as probe:
            meta["diary"][src.stem] = {"w": probe.width, "h": probe.height}
        if not any(stale(src, out) for out, *_ in jobs):
            continue
        im = flatten(Image.open(src))
        for out, w, fmt, opts in jobs:
            if stale(src, out):
                fit(im, w).save(out, fmt, **opts)
                print(out.relative_to(ROOT))


def sprites(src_dir, meta):
    out_dir = ASSETS / "sprites"
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(src_dir.glob("*.png")):
        im = Image.open(src).convert("RGBA")
        # Trim to the visible drawing; ignore near-invisible stray pixels.
        box = im.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
        if box:
            im = im.crop(box)
        meta["sprites"][src.stem] = {"w": im.width, "h": im.height}
        out = out_dir / f"{src.stem}.webp"
        if stale(src, out):
            im.save(out, "WEBP", quality=88, alpha_quality=90, method=6)
            print(out.relative_to(ROOT))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    originals = Path(sys.argv[1])
    meta_path = ASSETS / "meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    for key, fn in (("book", book), ("diary", diary), ("sprites", sprites)):
        if (originals / key).is_dir():
            meta[key] = {}
            fn(originals / key, meta)
    ASSETS.mkdir(exist_ok=True)
    meta_path.write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
