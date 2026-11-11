// The diary: one long scroll. This adds the bar that hides while reading, the chapter sheet,
// the progress line, and remembers the page.
const body = document.body;
const pages = [...document.querySelectorAll('.page')];
const sheet = document.querySelector('.sheet');
const links = new Map([...sheet.querySelectorAll('a')].map(a => [a.hash.slice(1), a]));
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// Pick up where the reader left off.
try {
  const last = !location.hash && document.getElementById(localStorage.getItem('diary'));
  if (last) last.scrollIntoView();
} catch {}

// Which page is under the middle of the screen?
const spy = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const page = entry.target, i = pages.indexOf(page);
    body.style.setProperty('--p', (i + 1) / pages.length);
    sheet.querySelector('[aria-current]')?.removeAttribute('aria-current');
    links.get(page.closest('.chapter').id).setAttribute('aria-current', 'true');
    try { i ? localStorage.setItem('diary', page.id) : localStorage.removeItem('diary'); } catch {}
  }
}, { rootMargin: '-50% 0px -50% 0px' });
pages.forEach(page => spy.observe(page));

// The bar gets out of the way when you read on, and comes back when you scroll up, tap, or move the mouse.
const hide = quiet => body.classList.toggle('quiet', quiet && !sheet.open);
let lastY = scrollY, queued = false;
addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    const y = Math.max(0, scrollY);
    if (Math.abs(y - lastY) < 8) return;
    hide(y > lastY && y > 60);
    lastY = y;
  });
}, { passive: true });
document.querySelector('.strip').addEventListener('click', () => hide(!body.classList.contains('quiet')));
addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && e.clientY < 120) hide(false); });
addEventListener('keydown', () => hide(false));

// Back to the shelf. Stepping back in history is instant, so do that when the shelf is where we came from;
// if that step turns out not to leave this page, go there the ordinary way.
let leaving;
document.querySelector('.back').addEventListener('click', e => {
  e.preventDefault();
  const shelf = new URL('../', location.href).href;
  if (document.referrer !== shelf || history.length < 2) { location.href = shelf; return; }
  history.back();
  leaving = setTimeout(() => { location.href = shelf; }, 400);
});
addEventListener('pagehide', () => clearTimeout(leaving));

// The chapter sheet.
function close() {
  if (calm.matches) return sheet.close();
  sheet.classList.add('closing');
  sheet.addEventListener('animationend', () => sheet.close(), { once: true });
}
sheet.addEventListener('close', () => { sheet.classList.remove('closing'); sheet.style.translate = ''; });
document.querySelector('.grid').addEventListener('click', () => {
  sheet.showModal();
  sheet.querySelector('[aria-current]')?.scrollIntoView({ block: 'center' });
});
sheet.addEventListener('click', e => {
  if (e.target === sheet || e.target.matches('.grab')) close(); // a tap outside it, or on its handle
  else if (e.target.closest('a')) sheet.close(); // a chapter was picked; the link does the jumping
});
sheet.addEventListener('cancel', e => { e.preventDefault(); close(); }); // Escape

// Drag the sheet down to dismiss it: by its handle, or anywhere once it is scrolled to the top.
let drag = null;
sheet.addEventListener('touchstart', e => {
  drag = sheet.scrollTop <= 0 || e.target.matches('.grab') ? { y: e.touches[0].clientY, dy: 0 } : null;
}, { passive: true });
sheet.addEventListener('touchmove', e => {
  if (!drag) return;
  drag.dy = Math.max(0, e.touches[0].clientY - drag.y);
  sheet.style.translate = `0 ${drag.dy}px`;
}, { passive: true });
sheet.addEventListener('touchend', () => {
  if (!drag) return;
  if (drag.dy > 90) close();
  else sheet.style.translate = '';
  drag = null;
});
