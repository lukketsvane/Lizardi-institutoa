// The picture book. Swiping is native scrolling (scroll-snap). This adds tapping to turn the page,
// keys, pull-down-to-close, the colour of the controls, the progress line, and remembers the page.
const pages = document.querySelector('.pages');
const spreads = [...pages.querySelectorAll('.spread')];
const prev = document.querySelector('.prev');
const next = document.querySelector('.next');
const count = document.querySelector('.count');
const tint = document.querySelector('.tint');
const tall = matchMedia('(max-aspect-ratio: 1/1)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const byHash = () => document.getElementById(location.hash.slice(1));

// Wide window: one stop per spread. Tall window: one stop per page.
const stops = () => (tall.matches ? spreads.flatMap(s => [...s.querySelectorAll('i')]) : spreads);
const middle = el => { const r = el.getBoundingClientRect(); return (r.left + r.right) / 2; };
// The scroll position that puts a stop in the middle of the window.
const home = el => Math.round(pages.scrollLeft + middle(el) - innerWidth / 2);

function where() {
  const list = stops(), centre = innerWidth / 2;
  let at = 0;
  list.forEach((el, i) => { if (Math.abs(middle(el) - centre) < Math.abs(middle(list[at]) - centre)) at = i; });
  return [list, at];
}

// Where a spread opens: on a phone that is its first page, except the cover, which opens on its front (right) half.
const landing = spread => (tall.matches ? spread.querySelectorAll('i')[spread === spreads[0] ? 1 : 0] : spread);

// Turning the page uses the browser's own smooth scrolling. Some versions of Safari drop or undo a
// smooth scroll inside a snapping container, so once the scrolling has stopped we check that the
// page really is where it was heading, and put it there if not.
let aim = -1, settle;
function arrive() {
  clearTimeout(settle);
  const el = stops()[aim];
  aim = -1;
  if (el && Math.abs(home(el) - pages.scrollLeft) > 2) pages.scrollLeft = home(el);
}
function go(el, smooth) {
  clearTimeout(settle);
  if (!smooth || calm.matches) { aim = -1; pages.scrollLeft = home(el); return; }
  pages.scrollTo({ left: home(el), behavior: 'smooth' });
  settle = setTimeout(arrive, 700); // in case nothing scrolls at all
}

// Back to the shelf. Stepping back in history is instant, so do that when the shelf is where we came from;
// if that step turns out not to leave this page, go there the ordinary way.
let leaving;
function leave() {
  const shelf = new URL('../', location.href).href;
  if (document.referrer !== shelf || history.length < 2) { location.href = shelf; return; }
  history.back();
  leaving = setTimeout(() => { location.href = shelf; }, 400);
}
addEventListener('pagehide', () => clearTimeout(leaving));

function turn(by, tapped) {
  const [list, at] = where();
  const to = (aim < 0 ? at : aim) + by; // a second tap during a turn continues from where that turn is heading
  if (to >= list.length && tapped) return leave(); // tapping on past the last page puts the book away
  aim = Math.max(0, Math.min(list.length - 1, to));
  go(list[aim], Math.abs(aim - at) <= 2);
}

// Colours as [red, green, blue], so that two pages' colours can be blended while one turns into the other.
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const css = c => `rgb(${c.map(Math.round).join(' ')})`;
// The colours at the left and right edge of a stop: a single page has one, a spread two.
const known = new Map();
function colours(stop) {
  if (!known.has(stop)) {
    const spread = stop.closest('.spread'), side = stop === spread ? '' : stop.matches('i + i') ? '--r' : '--l';
    const colour = name => getComputedStyle(spread).getPropertyValue(name).trim();
    known.set(stop, [colour(side || '--l'), colour(side || '--r')]);
  }
  return known.get(stop);
}

// The controls take a darker or lighter shade of the page they sit on, as the book's own lettering does.
function ink(rgb) {
  const light = c => {
    const [r, g, b] = c.map(v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05;
  };
  const darker = rgb.map(v => v * 0.36), lighter = rgb.map(v => v + (255 - v) * 0.74);
  const shade = light(rgb) / light(darker) >= light(lighter) / light(rgb) ? darker : lighter;
  return css(shade);
}

// The status bar and the browser's own bars take the colour of the page. Older iOS reads the theme
// colour (and only notices a new tag, not a changed one); iOS 26 and later look at the page instead:
// at its background, and again whenever a strip fixed to the top edge comes or goes.
let tinted = '';
function paint(colour) {
  tinted = colour;
  const old = document.querySelector('meta[name="theme-color"]'), fresh = old.cloneNode();
  fresh.content = colour;
  old.replaceWith(fresh);
  tint.style.display = 'none';
  requestAnimationFrame(() => { tint.style.display = ''; });
}

// On a mouse the controls fade away while reading and come back when it moves. On a touch screen they stay.
let fade;
function wake() {
  document.body.classList.remove('quiet');
  clearTimeout(fade);
  if (mouse.matches) fade = setTimeout(() => document.body.classList.add('quiet'), 2500);
}

// The arrows are only there until the reader has found another way to turn the page (a tap, a swipe,
// a key); then they go, for good.
function learnt() {
  document.body.classList.add('learnt');
  try { localStorage.setItem('turns', '1'); } catch {}
}
try { if (localStorage.getItem('turns')) document.body.classList.add('learnt'); } catch {}

function update() {
  const [list, at] = where();
  const stop = list[at], spread = stop.closest('.spread'), n = spreads.indexOf(spread);
  // While a page is turning, everything around it is a blend of the two pages' colours, by how far along it is.
  const off = middle(stop) - innerWidth / 2, other = list[at + (off < 0 ? 1 : -1)];
  const along = other ? Math.min(0.5, Math.abs(off / (middle(other) - middle(stop)))) : 0;
  const here = colours(stop), there = colours(other || stop);
  const left = mix(rgb(here[0]), rgb(there[0]), along), right = mix(rgb(here[1]), rgb(there[1]), along);
  if (here[0] !== tinted) paint(here[0]);
  document.body.style.setProperty('--page', css(left));
  document.body.style.setProperty('--ink-l', ink(left));
  document.body.style.setProperty('--ink-r', ink(right));
  document.body.style.setProperty('--p', (at + 1) / list.length);
  count.textContent = `${n + 1} / ${spreads.length}`;
  prev.disabled = at === 0;
  next.disabled = at === list.length - 1;
  if (location.hash !== '#' + spread.id) history.replaceState(null, '', '#' + spread.id);
  // Remember the page, but start from the cover again once the book is finished.
  try { n && n < spreads.length - 1 ? localStorage.setItem('book', spread.id) : localStorage.removeItem('book'); } catch {}
  // Fetch the next two spreads ahead of the reader, so turning the page never waits.
  for (const s of spreads.slice(n + 1, n + 3)) s.querySelector('img').loading = 'eager';
}

let queued = false;
pages.addEventListener('scroll', () => {
  if (aim >= 0) { clearTimeout(settle); settle = setTimeout(arrive, 160); }
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; update(); });
}, { passive: true });

// Tap anywhere to turn the page: the left third goes back, the rest goes on.
pages.addEventListener('click', e => { learnt(); turn(e.clientX < innerWidth / 3 ? -1 : 1, true); });
pages.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) learnt(); }, { passive: true }); // a sideways swipe on a trackpad
prev.addEventListener('click', () => turn(-1));
next.addEventListener('click', () => turn(1));
document.querySelector('.back').addEventListener('click', e => { e.preventDefault(); leave(); });
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') wake(); });
addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  wake();
  if (e.key === 'Escape') return leave();
  if (e.key === ' ' && e.target.closest('a, button')) return;
  const by = { ArrowRight: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, PageUp: -1, Home: -999, End: 999 }[e.key];
  if (by) { e.preventDefault(); learnt(); turn(by); }
});
addEventListener('hashchange', () => { if (byHash()) go(landing(byHash()), false); });
tall.addEventListener('change', () => go(landing(byHash() || spreads[0]), false)); // the phone was turned

// Pull the book down to put it away, like a photo.
let pull = null;
pages.addEventListener('touchstart', e => {
  clearTimeout(settle); // never move the page under a finger
  pull = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, on: false } : null;
}, { passive: true });
pages.addEventListener('touchmove', e => {
  if (!pull) return;
  const dx = e.touches[0].clientX - pull.x, dy = e.touches[0].clientY - pull.y;
  if (!pull.on) {
    if (Math.abs(dx) > 12 || dy < -12) { // a swipe to the next page, or an upward flick
      if (Math.abs(dx) > 12) learnt();
      pull = null;
      clearTimeout(settle); // the finger takes over from any turn in progress
      aim = -1;
      return;
    }
    if (dy < 16) return;
    pull.on = true;
    pages.style.overflow = 'hidden'; // no page turns while it is being pulled
  }
  pull.dy = Math.max(0, dy);
  pages.style.translate = `0 ${pull.dy}px`;
  pages.style.opacity = 1 - Math.min(0.5, pull.dy / 500);
}, { passive: true });
function release() {
  if (aim >= 0) settle = setTimeout(arrive, 700); // the finger is gone: see the turn through
  if (!pull || !pull.on) { pull = null; return; }
  const far = pull.dy > 110;
  pull = null;
  if (far) return leave();
  pages.style.transition = 'translate .25s, opacity .25s';
  pages.style.translate = pages.style.opacity = pages.style.overflow = '';
  setTimeout(() => { pages.style.transition = ''; }, 260);
}
pages.addEventListener('touchend', release);
pages.addEventListener('touchcancel', release);
// Coming back with the forward gesture: undo the pull.
addEventListener('pageshow', e => { if (e.persisted) pages.style.translate = pages.style.opacity = pages.style.overflow = ''; });

// Open where the address says, or where the reader left off, or on the cover.
let saved = null;
try { saved = document.getElementById(localStorage.getItem('book')); } catch {}
go(landing(byHash() || saved || spreads[0]), false);
update();
wake();
