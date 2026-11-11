// Scatter the cut-out drawings around the title, like on the book cover.
const stage = document.querySelector('.stage');
const copy = document.querySelector('.hero-copy');
const nav = document.querySelector('.topnav');
const sprites = JSON.parse(stage.dataset.sprites) // [name, width, height, tilts]
  .sort((a, b) => b[1] * b[2] - a[1] * a[2]);

// Small seeded generator, so the garden looks the same on every visit.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const overlaps = (a, b, slack) =>
  a.x + a.w * slack < b.x + b.w && b.x + b.w * slack < a.x + a.w &&
  a.y + a.h * slack < b.y + b.h && b.y + b.h * slack < a.y + a.h;

let laidOutFor = 0;
function layout() {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (Math.abs(W - laidOutFor) < 60) return;
  laidOutFor = W;
  const rand = seeded(21);
  const scale = Math.min(0.56, Math.max(0.27, W / 2500));
  const s = stage.getBoundingClientRect(), c = copy.getBoundingClientRect();
  const keepClear = [
    { x: c.left - s.left - 10, y: c.top - s.top - 10, w: c.width + 20, h: c.height + 20 },
    { x: 0, y: 0, w: W, h: nav.getBoundingClientRect().bottom - s.top },
  ];
  const placed = [];
  const imgs = [];
  for (const [name, w0, h0, tilts] of sprites) {
    const w = w0 * scale, h = h0 * scale;
    if (w > W * 0.6 || h > H * 0.5) continue;
    for (let tries = 0; tries < 90; tries++) {
      const box = { x: -w * 0.2 + rand() * (W - w * 0.6), y: keepClear[1].h + rand() * (H - keepClear[1].h - h * 0.7), w, h };
      if (keepClear.some(k => overlaps(box, k, 0)) || placed.some(p => overlaps(box, p, 0.1))) continue;
      placed.push(box);
      const img = new Image();
      img.src = `assets/sprites/${name}.webp`;
      img.alt = '';
      img.className = 'sprite';
      img.draggable = false;
      img.style.cssText = `left:${(box.x / W) * 100}%;top:${(box.y / H) * 100}%;width:${(w / W) * 100}%;` +
        `--i:${imgs.length};--r:${((rand() - 0.5) * (tilts ? 24 : 6)).toFixed(1)}deg;` +
        `--t:${(3.5 + rand() * 4).toFixed(1)}s;--d:${(-rand() * 6).toFixed(1)}s;--b:${(rand() < 0.5 ? -1 : 1) * (5 + rand() * 7) | 0}px`;
      imgs.push(img);
      break;
    }
  }
  stage.classList.remove('ready');
  stage.replaceChildren(...imgs);
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('ready')));
}

stage.addEventListener('click', e => {
  if (!e.target.classList.contains('sprite')) return;
  e.target.classList.remove('hop');
  void e.target.offsetWidth; // restart the animation
  e.target.classList.add('hop');
});
stage.addEventListener('animationend', e => e.target.classList.remove('hop'));

let timer;
addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(layout, 200); });
document.fonts.ready.then(layout);
