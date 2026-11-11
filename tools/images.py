#!/usr/bin/env python3
"""Turn the original artwork into web-sized images.

    python3 tools/images.py path/to/originals

Expected layout of the originals folder (PNG exports):

    book/01.png, 02.png ...        picture-book spreads, in reading order
    diary/intro-0.png, p20.png ... comic pages, named by the ids in content.json
    sprites/snail-pink.png ...     cut-out drawings with transparency

Writes assets/book, assets/diary, assets/sprites and assets/meta.json
(sizes, edge colours and tiny inline previews that tools/build.py needs),
plus the app icons, favicon.ico and the link-preview image. Existing, up-to-date
outputs are skipped. Needs Pillow >= 11.3 (pip install pillow).
"""
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
BOOK_WIDTHS = (480, 1280, 2400)
PAGE_AVIF_WIDTHS = (800, 1200, 1600)  # 2x phones and plain desktops, 3x phones, retina desktops and tablets
PAGE_WEBP_WIDTH = 1000  # fallback for browsers without AVIF
PAGE_THUMB_WIDTH = 240  # chapter picker
ICON_SPRITE, ICON_COLOUR = "lizard-stretching", "#8d76ad"  # Lizarda, on the lilac of her wall


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


def placeholder(im):
    """A 20px-wide preview, inlined in the page so something shows at once."""
    buf = io.BytesIO()
    fit(im, 20).save(buf, "WEBP", quality=40, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


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
            "lq": placeholder(im),
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
        jobs.append((out_dir / f"{src.stem}-{PAGE_THUMB_WIDTH}.webp", PAGE_THUMB_WIDTH, "WEBP", {"quality": 60, "method": 6}))
        im = flatten(Image.open(src))
        meta["diary"][src.stem] = {"w": im.width, "h": im.height, "lq": placeholder(im)}
        for out, w, fmt, opts in jobs:
            if stale(src, out):
                fit(im, w).save(out, fmt, **opts)
                print(out.relative_to(ROOT))


def cutout(src):
    """A drawing trimmed to its edges, without the stray faint pixels around it
    (they show up as a haze on light backgrounds)."""
    im = Image.open(src).convert("RGBA")
    alpha = im.getchannel("A")
    near_solid = alpha.point(lambda a: 255 if a > 110 else 0).filter(ImageFilter.MaxFilter(15))
    im.putalpha(ImageChops.multiply(alpha, near_solid))
    return im.crop(im.getbbox())


def sprites(src_dir, meta):
    out_dir = ASSETS / "sprites"
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(src_dir.glob("*.png")):
        im = cutout(src)
        meta["sprites"][src.stem] = {"w": im.width, "h": im.height}
        out = out_dir / f"{src.stem}.webp"
        if stale(src, out):
            im.save(out, "WEBP", quality=88, alpha_quality=90, method=6)
            print(out.relative_to(ROOT))


def icons(sprite_dir):
    """Home-screen icons and the favicon: one drawing centred on one colour."""
    art = cutout(sprite_dir / f"{ICON_SPRITE}.png")

    def icon(size, margin):
        figure = art.copy()
        figure.thumbnail((round(size * (1 - 2 * margin)),) * 2, Image.LANCZOS)
        im = Image.new("RGBA", (size, size), ICON_COLOUR)
        im.alpha_composite(figure, ((size - figure.width) // 2, (size - figure.height) // 2))
        return im.convert("RGB")

    out_dir = ASSETS / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)
    icon(180, 0.1).save(out_dir / "apple-touch-icon.png", optimize=True)
    icon(192, 0.1).save(out_dir / "icon-192.png", optimize=True)
    icon(512, 0.1).save(out_dir / "icon-512.png", optimize=True)
    icon(512, 0.22).save(out_dir / "icon-maskable-512.png", optimize=True)  # Android may crop it to a circle
    icon(48, 0.04).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("icons")


def link_preview(cover):
    """The picture shown when the address is shared: the title on the front cover."""
    im = Image.open(cover).convert("RGB")
    w, h = im.size
    im.crop((round(w * 0.5), round(h * 0.093), w, round(h * 0.093 + w * 0.5 * 630 / 1200))).resize((1200, 630), Image.LANCZOS).save(
        ASSETS / "og.jpg", quality=84, optimize=True)


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
    if (originals / "sprites" / f"{ICON_SPRITE}.png").exists():
        icons(originals / "sprites")
    if (originals / "book" / "01.png").exists():
        link_preview(originals / "book" / "01.png")
    meta_path.write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
