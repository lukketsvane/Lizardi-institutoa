// Highlight the chapter being read, in the chapter list and in the top bar.
const toc = document.querySelector('.toc');
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
