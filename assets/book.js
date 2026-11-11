// The picture book. Turning pages is native scrolling (scroll-snap); this adds tap zones,
// keys, pull-down-to-close, the progress line, and remembers the page.
const pages = document.querySelector('.pages');
const spreads = [...pages.querySelectorAll('.spread')];
const prev = document.querySelector('.prev');
const next = document.querySelector('.next');
const bar = document.querySelector('.progress i');
const count = document.querySelector('.count');
const theme = document.querySelector('meta[name="theme-color"]');
const tall = matchMedia('(max-aspect-ratio: 1/1)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const byHash = () => document.getElementById(location.hash.slice(1));

// Wide window: one stop per spread. Tall window: one stop per page.
const stops = () => (tall.matches ? spreads.flatMap(s => [...s.querySelectorAll('i')]) : spreads);
const middle = el => { const r = el.getBoundingClientRect(); return (r.left + r.right) / 2; };

function where() {
  const list = stops(), centre = innerWidth / 2;
  let at = 0;
  list.forEach((el, i) => { if (Math.abs(middle(el) - centre) < Math.abs(middle(list[at]) - centre)) at = i; });
  return [list, at];
}

// Where a spread opens: on a phone that is its first page, except the cover, which opens on its front (right) half.
const landing = spread => (tall.matches ? spread.querySelectorAll('i')[spread === spreads[0] ? 1 : 0] : spread);

function show(el, smooth) {
  el.scrollIntoView({ behavior: smooth && !calm.matches ? 'smooth' : 'instant', inline: 'center', block: 'nearest' });
}

function turn(by) {
  const [list, at] = where();
  show(list[Math.max(0, Math.min(list.length - 1, at + by))], true);
}

// The controls fade away while reading. A tap in the middle, or moving the mouse, brings them back.
let fade;
function wake(stay) {
  document.body.classList.remove('quiet');
  clearTimeout(fade);
  if (!stay) fade = setTimeout(() => document.body.classList.add('quiet'), 2500);
}

// Back to the shelf. Stepping back in history is instant, so do that when the shelf is where we came from.
function leave() {
  const shelf = new URL('../', location.href).href;
  if (document.referrer === shelf && history.length > 1) history.back();
  else location.href = shelf;
}

function update() {
  const [list, at] = where();
  const stop = list[at], spread = stop.closest('.spread'), n = spreads.indexOf(spread);
  // The status bar takes the colour of the page under it.
  theme.content = getComputedStyle(spread).getPropertyValue(stop.matches('i + i') ? '--r' : '--l').trim();
  bar.style.scale = `${(at + 1) / list.length} 1`;
  count.textContent = `${n + 1} / ${spreads.length}`;
  prev.disabled = at === 0;
  next.disabled = at === list.length - 1;
  if (location.hash !== '#' + spread.id) history.replaceState(null, '', '#' + spread.id);
  // Remember the page, but start from the cover again once the book is finished.
  try { n && n < spreads.length - 1 ? localStorage.setItem('book', spread.id) : localStorage.removeItem('book'); } catch {}
  if (at === list.length - 1) wake(true); // the last page: leave the way out in view
  // Fetch the next two spreads ahead of the reader, so turning the page never waits.
  for (const s of spreads.slice(n + 1, n + 3)) s.querySelector('img').loading = 'eager';
}

let queued = false;
pages.addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; update(); });
}, { passive: true });

prev.addEventListener('click', () => turn(-1));
next.addEventListener('click', () => turn(1));
document.querySelector('.back').addEventListener('click', e => { e.preventDefault(); leave(); });
pages.addEventListener('click', e => {
  const x = e.clientX / innerWidth;
  if (x < 0.28) turn(-1);
  else if (x > 0.72) turn(1);
  else if (document.body.classList.contains('quiet')) wake();
  else document.body.classList.add('quiet');
});
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') wake(); });
addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') return leave();
  if (e.key === ' ' && e.target.closest('a, button')) return;
  const by = { ArrowRight: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, PageUp: -1, Home: -999, End: 999 }[e.key];
  if (by) { e.preventDefault(); turn(by); }
});
addEventListener('hashchange', () => { if (byHash()) show(landing(byHash()), true); });
tall.addEventListener('change', () => show(landing(byHash() || spreads[0]), false)); // the phone was turned

// Pull the book down to put it away, like a photo.
let pull = null;
pages.addEventListener('touchstart', e => {
  const zoomed = window.visualViewport && visualViewport.scale > 1.02;
  pull = e.touches.length === 1 && !zoomed ? { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, on: false } : null;
}, { passive: true });
pages.addEventListener('touchmove', e => {
  if (!pull) return;
  const dx = e.touches[0].clientX - pull.x, dy = e.touches[0].clientY - pull.y;
  if (!pull.on) {
    if (Math.abs(dx) > 12 || dy < -12) { pull = null; return; } // a page turn, or an upward flick
    if (dy < 16) return;
    pull.on = true;
    pages.style.overflow = 'hidden'; // no page turns while it is being pulled
  }
  pull.dy = Math.max(0, dy);
  pages.style.translate = `0 ${pull.dy}px`;
  pages.style.opacity = 1 - Math.min(0.5, pull.dy / 500);
}, { passive: true });
function release() {
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
show(landing(byHash() || saved || spreads[0]), false);
update();
wake();
