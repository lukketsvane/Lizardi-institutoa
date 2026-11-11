// The background collage: the cut-out drawings scattered across the whole window.
// Each one slides past at its own speed as the page scrolls, so the pattern never stays the same.
// They also land differently on every visit.
const wall = document.querySelector('.wall');
const drawings = JSON.parse(wall.dataset.sprites); // [name, width, height, tilts]
const folder = wall.dataset.src;
const cover = +wall.dataset.cover; // how much of the window the drawings fill, 0 to 1
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const mod = (a, n) => ((a % n) + n) % n;

let items = [], width = 0, height = 0, nudge = 0;

function scatter() {
  width = wall.clientWidth;
  height = wall.clientHeight;
  const scale = Math.min(0.56, Math.max(0.25, width / 2500));
  const shuffled = drawings.map(d => [Math.random(), d]).sort((a, b) => a[0] - b[0]).map(pair => pair[1]);
  let filled = 0;
  items = [];
  for (const [name, w0, h0, tilts] of shuffled) {
    const w = w0 * scale, h = h0 * scale;
    if (w > width * 0.6 || h > height * 0.5) continue;
    if (filled > width * height * cover) break;
    filled += w * h;
    const img = new Image();
    img.src = `${folder}${name}.webp`;
    img.alt = '';
    img.className = 'sprite';
    img.draggable = false;
    img.style.cssText = `left:${(-w * 0.2 + Math.random() * (width - w * 0.6)).toFixed(0)}px;width:${w.toFixed(0)}px;` +
      `--i:${items.length};--t:${(3.5 + Math.random() * 4).toFixed(1)}s;--d:${(-Math.random() * 6).toFixed(1)}s;` +
      `--b:${(Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6) | 0}px`;
    items.push({
      img, h,
      y: Math.random() * (height + h),
      speed: 0.12 + Math.random() * 0.5, // of the scrolling speed
      tilt: (Math.random() - 0.5) * (tilts ? 24 : 6),
      spin: tilts ? (Math.random() - 0.5) * 0.03 : 0, // degrees per pixel scrolled; plants stay upright
    });
  }
  wall.classList.remove('ready', 'settled');
  wall.replaceChildren(...items.map(item => item.img));
  place();
  requestAnimationFrame(() => requestAnimationFrame(() => wall.classList.add('ready')));
  setTimeout(() => wall.classList.add('settled'), 2200); // all arrived: from now on they answer at once
}

// Each drawing leaves at the top and comes back in at the bottom.
function place() {
  const y = calm.matches ? 0 : scrollY + nudge;
  for (const item of items) {
    item.img.style.translate = `0 ${(mod(item.y - y * item.speed, height + item.h) - item.h).toFixed(1)}px`;
    item.img.style.rotate = `${(item.tilt + y * item.spin).toFixed(2)}deg`;
  }
}

let queued = false;
function move() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; place(); });
}
addEventListener('scroll', move, { passive: true });
// The shelf does not scroll, so there a swipe (or the wheel) stirs the collage itself,
// and it glides on for a moment after the finger lifts.
if ('stir' in wall.dataset) {
  let last = null, speed = 0, gliding = 0;
  const glide = () => {
    nudge += speed;
    speed *= 0.94;
    place();
    gliding = Math.abs(speed) > 0.3 ? requestAnimationFrame(glide) : 0;
  };
  addEventListener('pointerdown', e => {
    cancelAnimationFrame(gliding);
    last = e.clientY;
    speed = 0;
  });
  addEventListener('pointermove', e => {
    if (last === null) return;
    speed = last - e.clientY;
    nudge += speed;
    last = e.clientY;
    move();
  });
  for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => {
    if (last === null) return;
    last = null;
    if (!calm.matches) gliding = requestAnimationFrame(glide);
  });
  addEventListener('wheel', e => { nudge += e.deltaY; move(); }, { passive: true });
}

// A tap you can feel. iPhones have no vibration for web pages, but flipping a switch gives a small
// tick (iOS 18 and later), so flip a hidden one. Other phones vibrate for a moment.
function tick() {
  if (navigator.vibrate) return navigator.vibrate(8);
  const label = document.createElement('label'), toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.setAttribute('switch', '');
  label.style.display = 'none';
  label.append(toggle);
  document.head.append(label);
  label.click();
  label.remove();
}

// Poke a drawing: it gives under the finger, then springs up, and the ones around it jump too.
function hop(img, wait, height) {
  img.style.setProperty('--wait', `${wait}ms`);
  img.style.setProperty('--jump', `${-height}px`);
  img.style.setProperty('--kick', `${(Math.random() - 0.5) * 30}deg`);
  img.classList.remove('hop');
  void img.offsetWidth; // restart the animation
  img.classList.add('hop');
}
const centre = img => { const r = img.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
let pressed;
wall.addEventListener('pointerdown', e => {
  if (!e.target.classList.contains('sprite')) return;
  pressed = e.target;
  pressed.classList.add('press');
});
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => pressed?.classList.remove('press'));
wall.addEventListener('click', e => {
  if (!e.target.classList.contains('sprite')) return;
  const [x, y] = centre(e.target);
  for (const { img } of items) {
    const [x2, y2] = centre(img), far = Math.hypot(x2 - x, y2 - y);
    if (img === e.target) hop(img, 0, 52);
    else if (far < 150) hop(img, 60 + far, 26 - far / 8);
  }
  tick();
});
wall.addEventListener('animationend', e => e.target.classList.remove('hop'));

let timer;
addEventListener('resize', () => {
  if (Math.abs(wall.clientWidth - width) < 60) { height = wall.clientHeight; return move(); } // e.g. the toolbar sliding away
  clearTimeout(timer);
  timer = setTimeout(scatter, 200);
});
scatter();
