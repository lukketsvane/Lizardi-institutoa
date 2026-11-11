#!/usr/bin/env python3
"""Generate index.html, book/index.html and diary/index.html.

    python3 tools/build.py

Reads content.json (order, titles, alt text) and assets/meta.json (image sizes,
written by tools/images.py). No dependencies.
"""
import json
import random
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
C = json.loads((ROOT / "content.json").read_text())
M = json.loads((ROOT / "assets" / "meta.json").read_text())
SITE, BOOK, DIARY, SPRITES = C["site"], C["book"], C["diary"], C["sprites"]


def e(s):
    return escape(s, quote=True)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def head(title, description, root, theme):
    og = (SITE["url"].rstrip("/") + "/" if SITE["url"] else root) + "assets/og.jpg"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<meta name="theme-color" content="{theme}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="{root}assets/favicon.png">
<link rel="preload" href="{root}assets/fonts/dynapuff.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}assets/fonts/shantell-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/site.css">
</head>
"""


def wave(seed):
    """A wobbly hand-cut edge that sits on top of a band."""
    rnd = random.Random(seed)
    n = 9
    pts = [(round(i * 1440 / n), rnd.randint(8, 58)) for i in range(n + 1)]
    d = f"M0 64V{pts[0][1]}"
    for (x0, y0), (x1, y1) in zip(pts[1:], pts[2:]):
        d += f"Q{x0} {y0} {(x0 + x1) // 2} {(y0 + y1) // 2}"
    d += f"T1440 {pts[-1][1]}V64Z"
    return f'<svg class="wave" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true"><path d="{d}"/></svg>'


def page_picture(page, root, sizes, eager=False):
    w, h = M["diary"][page["id"]]["w"], M["diary"][page["id"]]["h"]
    base = f"{root}assets/diary/{page['id']}"
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (
        f'<picture><source type="image/avif" srcset="{base}-800.avif 800w, {base}-1400.avif 1400w" sizes="{sizes}">'
        f'<img src="{base}-1000.webp" width="1000" height="{round(1000 * h / w)}" alt="{e(page["alt"])}" {load} decoding="async"></picture>'
    )


def spread_alt(s):
    return " ".join(f"{side} page: {s[key]}" for side, key in (("Left", "left"), ("Right", "right")) if s[key])


def chapters():
    return [dict(ch, slug=slug(ch["title"])) for ch in DIARY["chapters"]]


def sprite_list(kinds):
    return [(name, M["sprites"][name]["w"], M["sprites"][name]["h"], kind) for name, kind in SPRITES.items() if kind in kinds]


# ---------------------------------------------------------------- home

def home():
    walker = SITE["footer_sprite"]
    garden = [[n, w, h, int(k in ("bug", "poop", "lizard"))] for n, w, h, k in sprite_list(("plant", "bug", "animal", "lizard", "poop", "rock")) if n != walker]
    microbes = sprite_list(("microbe", "ring"))
    rows = [microbes[0::2], microbes[1::2]]

    def drift(row, cls=""):
        imgs = "".join(f'<img src="assets/sprites/{n}.webp" width="{w}" height="{h}" style="--w:{w}" alt="" loading="lazy" decoding="async">' for n, w, h, _ in row)
        return f'<div class="drift{cls}" aria-hidden="true"><div class="set">{imgs}</div><div class="set">{imgs}</div></div>'

    letters = "".join(
        '<span class="w">' + "".join(f'<span class="ch" data-c="{c}">{c}</span>' for c in word) + "</span>"
        for word in SITE["name"].split()
    )
    n = len(BOOK["spreads"])
    strip = "".join(
        f'<li><a href="book/#{i}"><img src="assets/book/{s["id"]}-480.webp" width="480" height="{round(480 * M["book"][s["id"]]["h"] / M["book"][s["id"]]["w"])}" '
        f'alt="{e("Spread %d. %s" % (i, spread_alt(s)))}" loading="lazy" decoding="async"></a></li>'
        for i, s in enumerate(BOOK["spreads"], 1) if i > 1
    )
    chs = chapters()
    pages = {p["id"]: p for ch in chs for p in ch["pages"]}
    fan = "".join(page_picture(pages[i], "", "(min-width: 500px) 330px, 70vw") for i in DIARY["teaser"])
    toc = "".join(
        f'<li><a href="diary/#{ch["slug"]}"><span>{e(ch["title"])}</span><small>{len(ch["pages"])} page{"s" * (len(ch["pages"]) > 1)}</small></a></li>'
        for ch in chs
    )
    cover = BOOK["spreads"][0]
    return head(SITE["name"], SITE["description"], "", "#c48c33") + f"""<body>
<a class="skip" href="#main">Skip to content</a>
<header class="hero">
<div class="stage" aria-hidden="true" data-sprites='{json.dumps(garden, separators=(",", ":"))}'></div>
<nav class="topnav" aria-label="Site">
<a href="./" aria-current="page">{e(SITE["name"])}</a>
<span class="links"><a href="book/">The book</a><a href="diary/">The diary</a></span>
</nav>
<div class="hero-copy">
<h1><span class="vh">{e(SITE["name"])}</span><span class="bubble" aria-hidden="true">{letters}</span></h1>
<p class="lede">{e(SITE["lede"])}</p>
<p class="cta"><a class="btn" href="book/">Read the picture book</a><a class="btn light" href="diary/">Open the diary</a></p>
</div>
</header>
<main id="main">
<section class="band teal" id="book" aria-labelledby="book-h">
{wave(3)}
<div class="wrap two">
<a class="cover" href="book/" aria-label="Read {e(BOOK["title"])}"><img src="assets/book/{cover["id"]}-1280.webp" width="1280" height="904" alt="" decoding="async"></a>
<div class="txt">
<p class="eyebrow">The picture book</p>
<h2 id="book-h">{e(BOOK["title"])}</h2>
<p>{e(BOOK["blurb"])}</p>
<p><a class="btn light" href="book/">Read the book</a></p>
</div>
</div>
<ul class="strip" aria-label="All {n} spreads">{strip}</ul>
</section>
<section class="band gut" aria-labelledby="within-h">
{wave(11)}
{drift(rows[0])}
<h2 id="within-h">{e(SITE["within"][0])}</h2>
<p>{e(SITE["within"][1])}</p>
{drift(rows[1], " back")}
</section>
<section class="band paper" id="diary" aria-labelledby="diary-h">
{wave(5)}
<div class="wrap two rev">
<div class="txt">
<p class="eyebrow">The diary</p>
<h2 id="diary-h">{e(DIARY["title"])}</h2>
<p>{e(DIARY["blurb"])}</p>
<p><a class="btn" href="diary/">Start reading</a></p>
</div>
<a class="fan" href="diary/" aria-label="Open {e(DIARY["title"])}">{fan}</a>
</div>
<nav class="wrap chapters" aria-labelledby="chapters-h">
<h3 id="chapters-h">Chapters</h3>
<ol>{toc}</ol>
</nav>
</section>
</main>
<footer class="foot">
{wave(8)}
<img class="walker" src="assets/sprites/{walker}.webp" width="{M["sprites"][walker]["w"]}" height="{M["sprites"][walker]["h"]}" alt="" loading="lazy" decoding="async">
<div class="wrap">
<strong>{e(SITE["name"])}</strong>
<nav aria-label="Footer"><a href="book/">The book</a><a href="diary/">The diary</a></nav>
</div>
</footer>
<script src="assets/home.js" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------- book

def book():
    spreads = BOOK["spreads"]
    n = len(spreads)
    first = M["book"][spreads[0]["id"]]
    out = []
    for i, s in enumerate(spreads, 1):
        m = M["book"][s["id"]]
        base = f"../assets/book/{s['id']}"
        load = 'fetchpriority="high"' if i == 1 else 'loading="lazy"'
        out.append(
            f'<div class="spread" id="{i}" style="--l:{m["l"]};--r:{m["r"]}">'
            f'<img src="{base}-1280.webp" srcset="{base}-1280.webp 1280w, {base}-2400.webp 2400w" sizes="(max-aspect-ratio: 1/1) 200vw, 100vw" '
            f'width="{m["w"]}" height="{m["h"]}" alt="{e(spread_alt(s))}" {load} decoding="async"><i></i><i></i></div>'
        )
    end = BOOK["end"]
    em = M["sprites"][end]
    return head(f'{BOOK["title"]} · {SITE["name"]}', BOOK["blurb"], "../", "#fdf3da") + f"""<body class="reader">
<header class="rbar">
<a href="../"><span class="arrow"></span>Home</a>
<h1>{e(BOOK["title"])}</h1>
<span class="count" aria-live="polite">1 / {n}</span>
</header>
<main class="pages" tabindex="0" aria-label="{e(BOOK["title"])}, {n} spreads" style="--ar:{first["w"] / first["h"]:.4f}">
{chr(10).join(out)}
<div class="spread end" id="end">
<img src="../assets/sprites/{end}.webp" width="{em["w"]}" height="{em["h"]}" alt="" loading="lazy">
<h2>The end</h2>
<p><a class="btn light" href="#1">Read it again</a><a class="btn light" href="../diary/">Open the diary</a></p>
</div>
</main>
<button class="turn prev" type="button" aria-label="Previous page" disabled></button>
<button class="turn next" type="button" aria-label="Next page"></button>
<noscript><style>.pages{{scrollbar-width:auto}}.turn{{display:none}}</style></noscript>
<script src="../assets/book.js" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------- diary

def diary():
    chs = chapters()
    toc = "".join(f'<li><a href="#{ch["slug"]}">{e(ch["title"])}</a></li>' for ch in chs)
    sizes = "(min-width: 860px) 760px, calc(100vw - 32px)"
    sections = []
    for ci, ch in enumerate(chs):
        figs = "".join(
            f'<figure class="page" id="{p["id"]}">{page_picture(p, "../", sizes, eager=(ci == 0 and pi == 0))}</figure>'
            for pi, p in enumerate(ch["pages"])
        )
        sections.append(f'<section class="chapter" id="{ch["slug"]}" aria-labelledby="{ch["slug"]}-h"><h2 id="{ch["slug"]}-h">{e(ch["title"])}</h2>{figs}</section>')
    return head(f'{DIARY["title"]} · {SITE["name"]}', DIARY["blurb"], "../", "#f5f1f8") + f"""<body class="diary">
<a class="skip" href="#read">Skip to the comic</a>
<header class="dbar">
<a href="../"><span class="arrow"></span>Home</a>
<span class="now" aria-hidden="true"></span>
<a class="jump" href="#toc">Chapters</a>
</header>
<div class="dlayout">
<header class="dhead">
<h1>{e(DIARY["title"])}</h1>
<p>{e(DIARY["blurb"])}</p>
<p class="note">{e(DIARY["note"])}</p>
</header>
<nav class="toc" id="toc" aria-labelledby="toc-h">
<h2 id="toc-h">Chapters</h2>
<ol>{toc}</ol>
</nav>
<main class="dmain" id="read">
{chr(10).join(sections)}
<p class="dend"><a class="btn" href="#toc">Back to the chapters</a><a class="btn light" href="../book/">Read the picture book</a></p>
</main>
</div>
<script src="../assets/diary.js" defer></script>
</body>
</html>
"""


def main():
    for path, html in (("index.html", home()), ("book/index.html", book()), ("diary/index.html", diary())):
        out = ROOT / path
        out.parent.mkdir(exist_ok=True)
        out.write_text(html)
        print(path, f"{len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
