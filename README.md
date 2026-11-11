# Lizardi Institutoa

A small static website for the picture book *Lizarda and the World Within* and the PhD diary comic.

- `index.html` – home
- `book/` – picture-book reader (one spread at a time; one page at a time on a phone held upright)
- `diary/` – comic reader, one long scroll with a chapter list

Plain HTML, CSS and a little JavaScript. No build step is needed to host it: point any static host (Vercel, GitHub Pages, …) at the repository root. All links are relative, so it also works from a sub-folder.

To look at it locally:

    python3 -m http.server

## Changing the content

The three HTML files are generated. Edit `content.json`, then run:

    python3 tools/build.py

`content.json` holds the order of the book spreads and diary pages, the chapter titles, the short texts on the home page, and the alt text (a transcription) for every page. To reorder or retitle something, change it there. Set `site.url` to the public address once there is one, so link previews get an absolute image URL.

## Adding or replacing artwork

Put the PNG exports in a folder laid out like this (`originals/` is git-ignored):

    originals/book/01.png, 02.png, …      spreads, in reading order
    originals/diary/intro-0.png, p20.png  comic pages, named by their id in content.json
    originals/sprites/snail-pink.png      cut-out drawings with transparency

and run (needs `pip install pillow`):

    python3 tools/images.py originals
    python3 tools/build.py

That writes the web-sized images into `assets/` and records their sizes in `assets/meta.json`. A new diary page also needs an entry in `content.json`; a new sprite needs a line under `sprites` saying what kind of thing it is (garden things go to the home-page title, microbes to the purple band).

## Fonts

DynaPuff and Shantell Sans, both under the SIL Open Font License (texts in `assets/fonts/`).
