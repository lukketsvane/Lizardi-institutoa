// Page turning for the picture book. The scrolling itself is native (scroll-snap);
// this adds buttons, keys, tap zones, the counter and a shareable #page.
const pages = document.querySelector('.pages');
const spreads = [...pages.querySelectorAll('.spread')];
const count = document.querySelector('.count');
const prev = document.querySelector('.turn.prev');
const next = document.querySelector('.turn.next');
const tall = matchMedia('(max-aspect-ratio: 1/1)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const total = spreads.length - 1; // the last one is the end card

// Wide window: one stop per spread. Tall window: one stop per page.
const stops = () => (tall.matches ? spreads.flatMap(s => (s.id === 'end' ? [s] : [...s.querySelectorAll('i')])) : spreads);
const middle = el => { const r = el.getBoundingClientRect(); return (r.left + r.right) / 2; };

function where() {
  const list = stops(), centre = innerWidth / 2;
  let at = 0;
  list.forEach((el, i) => { if (Math.abs(middle(el) - centre) < Math.abs(middle(list[at]) - centre)) at = i; });
  return [list, at];
}

// Where a spread opens: on a phone that is its first page, except the cover, which opens on its front (right) half.
const landing = spread => (!tall.matches || spread.id === 'end' ? spread : spread.querySelectorAll('i')[spread === spreads[0] ? 1 : 0]);

function show(el, smooth) {
  el.scrollIntoView({ behavior: smooth && !calm.matches ? 'smooth' : 'instant', inline: 'center', block: 'nearest' });
}

function turn(by) {
  const [list, at] = where();
  show(list[Math.max(0, Math.min(list.length - 1, at + by))], true);
}

function update() {
  const [list, at] = where();
  const spread = list[at].closest('.spread');
  count.textContent = spread.id === 'end' ? 'The end' : `${spread.id} / ${total}`;
  prev.disabled = at === 0;
  next.disabled = at === list.length - 1;
  if (location.hash !== '#' + spread.id) history.replaceState(null, '', '#' + spread.id);
  // Fetch the next two spreads ahead of the reader, so turning the page never waits.
  const i = spreads.indexOf(spread);
  for (const s of spreads.slice(i + 1, i + 3)) s.querySelector('img').loading = 'eager';
}

let queued = false;
pages.addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; update(); });
}, { passive: true });

prev.addEventListener('click', () => turn(-1));
next.addEventListener('click', () => turn(1));
pages.addEventListener('click', e => {
  if (e.target.closest('a')) return;
  const x = e.clientX / innerWidth;
  if (x < 0.3) turn(-1); else if (x > 0.7) turn(1);
});
addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === ' ' && e.target.closest('a, button')) return;
  const by = { ArrowRight: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, PageUp: -1, Home: -999, End: 999 }[e.key];
  if (by) { e.preventDefault(); turn(by); }
});
addEventListener('hashchange', () => {
  const target = document.getElementById(location.hash.slice(1));
  if (target) show(landing(target), true);
});

// Open on the right page.
show(landing(document.getElementById(location.hash.slice(1)) || spreads[0]), false);
update();
