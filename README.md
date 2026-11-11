# Lizardi Institutoa

The picture book *Lizarda and the World Within* and the PhD diary comic, as a small web app that can be added to the home screen.

- `index.html` – the shelf: the book and the diary lying on a collage of the cut-out drawings
- `book/` – the picture book: one page at a time on a phone held upright, one spread at a time otherwise
- `diary/` – the comic: one long scroll

There is no text or design of our own on the pages; the artwork is the interface.

The collage is the background of the shelf and the diary. The drawings land differently on every visit, and each one slides past at its own speed as the page scrolls, so the pattern keeps changing. On the shelf they are in colour and hop when poked; in the diary they are still and in the comic's own purple.

| | Phone | Mouse and keyboard |
|---|---|---|
| Turn a page | tap (the left third goes back, the rest goes on), or swipe | click, arrow keys, space |
| Put the book away | pull it down, tap the down arrow, or tap on past the last page | Esc, or click the down arrow |
| Chapters in the diary | tap the grid in the bar; drag the sheet down to dismiss | click the grid |
| Show the diary's bar | scroll up a little, or tap | move the mouse to the top |

The controls are bare arrows in a shade of the page they sit on. On a phone the book's controls sit in the bands above and below the page, off the artwork. Pinch and double-tap zoom are switched off, as in an app.

Both readers remember where you stopped. Pages you have opened stay available offline.

## Hosting

Plain HTML, CSS and JavaScript with no build step on the host: point any static host at the repository root. All links are relative, so it also works from a sub-folder.

To look at it locally:

    python3 -m http.server

## Changing the content

The three HTML files, `manifest.webmanifest` and `sw.js` are generated. Edit `content.json`, then run:

    python3 tools/build.py

`content.json` holds the order of the book spreads and diary pages, the chapter titles, which page stands for the diary on the shelf (`diary.cover`), the site address, and the alt text (a transcription) for every page. Run the build after any change to the files in `assets/` too: it stamps a version on the CSS and JS addresses and on the offline cache, so returning visitors get the new files.

## Adding or replacing artwork

Put the PNG exports in a folder laid out like this (`originals/` is git-ignored):

    originals/book/01.png, 02.png, …      spreads, in reading order
    originals/diary/intro-0.png, p20.png  comic pages, named by their id in content.json
    originals/sprites/snail-pink.png      cut-out drawings with transparency

and run (needs `pip install pillow`):

    python3 tools/images.py originals
    python3 tools/build.py

That writes the web-sized images into `assets/` and records their sizes in `assets/meta.json`. A new diary page also needs an entry in `content.json`; a new sprite needs a line under `sprites` saying what kind of thing it is.

The app icon and favicon are made from one of the sprites on one colour; change `ICON_SPRITE` and `ICON_COLOUR` at the top of `tools/images.py` to use another.

The shelf's background colour is `--garden` in `assets/site.css`. It is repeated as `GARDEN` in `tools/build.py` (browser and status bar colour) and as `SHELF_COLOUR` in `tools/images.py` (the launch screens an installed app shows while it starts), so change all three together.
