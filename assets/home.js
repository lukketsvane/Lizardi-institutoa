// Scatter the cut-out drawings around the book and the diary, like on the back of the book.
// They land differently on every visit.
const stage = document.querySelector('.stage');
const works = [...document.querySelectorAll('.work')];
const sprites = JSON.parse(stage.dataset.sprites) // [name, width, height, tilts]
  .sort((a, b) => b[1] * b[2] - a[1] * a[2]); // biggest first, while there is still room

const overlaps = (a, b, slack) =>
  a.x + a.w * slack < b.x + b.w && b.x + b.w * slack < a.x + a.w &&
  a.y + a.h * slack < b.y + b.h && b.y + b.h * slack < a.y + a.h;

let laidOutFor = 0;
function layout() {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (Math.abs(W - laidOutFor) < 60) return; // e.g. the address bar sliding away
  laidOutFor = W;
  const scale = Math.min(0.56, Math.max(0.25, W / 2500));
  // The drawings may tuck a little way under the edges of the book and the diary, no further.
  const keepClear = works.map(el => ({ x: el.offsetLeft + 10, y: el.offsetTop + 10, w: el.offsetWidth - 20, h: el.offsetHeight - 20 }));
  const placed = [];
  const imgs = [];
  for (const [name, w0, h0, tilts] of sprites) {
    const w = w0 * scale, h = h0 * scale;
    if (w > W * 0.6 || h > H * 0.5) continue;
    for (let tries = 0; tries < 40; tries++) {
      const box = { x: -w * 0.2 + Math.random() * (W - w * 0.6), y: -h * 0.15 + Math.random() * (H - h * 0.7), w, h };
      if (keepClear.some(k => overlaps(box, k, 0)) || placed.some(p => overlaps(box, p, 0.1))) continue;
      placed.push(box);
      const img = new Image();
      img.src = `assets/sprites/${name}.webp`;
      img.alt = '';
      img.className = 'sprite';
      img.style.cssText = `left:${(box.x / W) * 100}%;top:${(box.y / H) * 100}%;width:${(w / W) * 100}%;` +
        `--i:${imgs.length};--r:${((Math.random() - 0.5) * (tilts ? 24 : 6)).toFixed(1)}deg;` +
        `--t:${(3.5 + Math.random() * 4).toFixed(1)}s;--d:${(-Math.random() * 6).toFixed(1)}s;--b:${(Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 7) | 0}px`;
      imgs.push(img);
      break;
    }
  }
  stage.classList.remove('ready');
  stage.replaceChildren(...imgs);
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('ready')));
}

// Poke a drawing and it hops.
stage.addEventListener('click', e => {
  if (!e.target.classList.contains('sprite')) return;
  e.target.classList.remove('hop');
  void e.target.offsetWidth; // restart the animation
  e.target.classList.add('hop');
});
stage.addEventListener('animationend', e => e.target.classList.remove('hop'));

let timer;
addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(layout, 200); });
layout();
