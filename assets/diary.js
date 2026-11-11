// Highlight the chapter being read, in the chapter list and in the top bar.
const toc = document.querySelector('.toc');

// The chapter list is a closed disclosure on phones, so the comic starts right away,
// and an always-open sidebar on wide screens.
const wide = matchMedia('(min-width: 1040px)');
const sync = () => { if (wide.matches) toc.open = true; };
wide.addEventListener('change', () => { toc.open = wide.matches; });
toc.addEventListener('toggle', sync);
sync();
document.querySelectorAll('a[href="#toc"]').forEach(a => a.addEventListener('click', () => { toc.open = true; }));

const now = document.querySelector('.dbar .now');
const links = new Map([...toc.querySelectorAll('a')].map(a => [a.hash.slice(1), a]));

const spy = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    toc.querySelector('[aria-current]')?.removeAttribute('aria-current');
    const link = links.get(entry.target.id);
    link.setAttribute('aria-current', 'true');
    now.textContent = link.textContent;
    // Keep it in view inside the sticky chapter list (a no-op when the list is not scrollable).
    toc.scrollTop += link.getBoundingClientRect().top - toc.getBoundingClientRect().top - toc.clientHeight / 2;
  }
}, { rootMargin: '-40% 0px -60% 0px' });

document.querySelectorAll('.chapter').forEach(section => spy.observe(section));
