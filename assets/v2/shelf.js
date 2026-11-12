// The shelf as a specimen plate.
// One even grid of columns across the window. The book and the diary lie square in the middle of it, side by
// side, the two largest specimens. Every drawing stands upright in a cell of its own, on the baseline of its
// row, sized by what it is: a lizard fills its cell, a beetle sits small in it, a poop smaller.
// The collection is laid out the way a naturalist would: the garden at the top, then the bugs and the animals,
// and below the book the lizards with their poop and, at the bottom, the microbes inside them.
// A swipe or the wheel slides the rows sideways, one row left and the next right, and they come to rest on
// whole cells again. The rows run on behind the book, the diary and the face, so the plate keeps its order.

const wall = document.querySelector('.wall');
const shelf = document.querySelector('.shelf');
const works = [document.querySelector('.work.book'), document.querySelector('.work.diary')];
const nav = document.querySelector('.faces');
const faces = [...nav.querySelectorAll('a')];
const folder = wall.dataset.src;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (a, x, b) => Math.min(b, Math.max(a, x));
const mod = (a, n) => ((a % n) + n) % n;

// Width over height of the two works (the book's cover is the right half of the first spread), and of the tallest face.
const ratio = img => img.getAttribute('width') / img.getAttribute('height');
const ASPECT = [1288 / 1820, ratio(works[1].querySelector('img'))];
const FACE = Math.min(...faces.map(a => ratio(a.querySelector('img'))));

// ---------------------------------------------------------------- the collection, in the order it is laid out

// Each drawer is one stretch of the collection; a row of the plate holds one drawer or a few neighbouring ones.
// Within a drawer the drawings go by family, and within a family by colour, so a row reads as a gradient;
// near twins (the two dancing pairs, the two green spirals) are kept a few cells apart.
const DRAWERS = [
  ['flower-head-blue', 'flowers-purple-pair', 'bulb-magenta', 'flower-head-pink', 'branch-blossoms-pink', 'flowers-pink-three-stems',
    'mushrooms-pink-cap', 'flower-pink-on-stem', 'mushrooms-orange-purple-outline', 'flower-head-orange', 'mushrooms-trumpet-terracotta',
    'shrub-buds-mauve', 'mushrooms-orange', 'twig-with-leaves-grey', 'seed-pod-brown'],
  ['twig-forked-brown', 'branch-stump-brown', 'leaf-oak-mustard', 'sprig-buds-olive', 'sprout-curl-olive-purple', 'leaf-oak-green',
    'seedling-green', 'stem-bent-green', 'fern-curls-lime', 'grass-bent-bright-green', 'grass-fork-green', 'sprout-curl-tall-green',
    'stem-forked-green-buds', 'weed-spiky-olive', 'grass-bent-dark-olive', 'grass-curl-green', 'grass-arch-green'],
  ['butterfly-magenta', 'butterfly-orange', 'beetle-orange-small', 'bug-green-sitting', 'bug-pink-round', 'fly-purple-front',
    'fly-blue-top-view', 'spider-teal', 'worm-coiled-brown', 'worm-thin-brown', 'snail-yellow-brown-shell', 'snail-pink-shell',
    'snail-upright-magenta', 'slug-hat-lavender', 'slug-hat-green', 'slug-hat-orange', 'slug-sleeping-mustard-pink-hat',
    'slug-big-yellow-green', 'slug-pale-big-eye'],
  ['bird-purple-flying', 'bird-purple-perched', 'cat-grey-purple', 'mouse-sitting-orange', 'squirrel-orange-leaping', 'frog-green'],
  // the world within starts here: each lizard beside its poop, as in a tracker's guide, between the stones they bask on
  ['rocks-stacked-purple', 'lizard-running', 'poop-large-brown', 'lizard-leaping', 'poop-log-olive', 'lizard-stretching',
    'poop-small-ragged', 'lizard-walking-tongue-out', 'poop-tiny-tall', 'lizard-upside-down', 'poop-tiny', 'stone-wall-purple',
    'poop-on-green-plant'],
  // the rings lie among the microbes, like empty cells, each beside one of its colour
  ['microbe-dancing-pair-upright', 'microbe-star-magenta', 'microbe-branched-magenta', 'ring-small-mauve', 'microbe-pill-pink-tufted',
    'microbe-rod-knobbed-pink', 'microbe-star-yellow-pink', 'ring-peach', 'microbe-dancing-pair-leaning', 'microbe-star-orange-magenta',
    'microbe-star-ochre-green', 'microbe-budding-yellow', 'microbe-spiral-yellow', 'ring-lime', 'microbe-rods-mustard',
    'microbe-spiral-green', 'microbe-rod-teal-pili', 'ring-teal', 'microbe-chain-blue', 'microbe-spiral-green-2', 'microbe-branched-blue',
    'microbe-cilia-brown-blue'],
];
const WITHIN = 4; // the drawer the world within starts with: it goes below the book where it can
const HOME = { plant: 1, bug: 2, animal: 3, lizard: 4, rock: 4, poop: 4, ring: 5, microbe: 5 }; // where a new drawing goes

// How much of its cell a drawing of each kind takes: true proportion, more or less.
const PRESENCE = { lizard: 1, rock: 0.92, animal: 0.84, plant: 0.9, microbe: 0.74, bug: 0.6, ring: 0.7, poop: 0.48 };

const known = new Map(JSON.parse(wall.dataset.sprites).map(([name, w, h, , kind]) => [name, { name, w, h, kind }]));
const drawers = DRAWERS.map(names => names.filter(n => known.has(n)).map(n => known.get(n)));
const placed = new Set(drawers.flat().map(d => d.name));
for (const d of known.values()) if (!placed.has(d.name)) drawers[HOME[d.kind] ?? 2].push(d);
const collection = drawers.flat();
const breaks = new Set(drawers.map((_, i) => drawers.slice(0, i + 1).flat().length));
const within = drawers.slice(0, WITHIN).flat().length;

// Within a kind, bigger drawings stay a little bigger: the size each would have at the same scale, softened.
const median = {};
for (const kind of new Set(collection.map(d => d.kind))) {
  const sizes = collection.filter(d => d.kind === kind).map(d => Math.max(d.w, d.h)).sort((a, b) => a - b);
  median[kind] = sizes[sizes.length >> 1];
}
for (const d of collection) d.presence = Math.min(1, (PRESENCE[d.kind] ?? 0.7) * clamp(0.72, (Math.max(d.w, d.h) / median[d.kind]) ** 0.4, 1.15));

// ---------------------------------------------------------------- the plate: which grid suits this window

// Tries every sensible grid and keeps the one that scores best: cells close to square and to a size that suits
// the window, the works large, and enough drawings in the collection for every row to slide.
function plan(W, H, inset) {
  const margin = Math.round(clamp(12, Math.min(W, H) * 0.035, 36));
  const x0 = inset.left + margin, y0 = inset.top + margin;
  const Wb = W - inset.left - inset.right - 2 * margin, Hb = H - inset.top - inset.bottom - 2 * margin;
  const target = clamp(64, 80 * ((Wb * Hb) / 230000) ** 0.275, 200); // about 80px on a phone, 125 on a laptop
  const [ab, ad] = ASPECT;
  let best = null;
  const consider = option => { if (!best || option.score < best.score) best = option; };

  for (let C = 2; C <= 16; C++) {
    const g = Math.round(clamp(8, (Wb / C) * 0.12, 22));
    const p = (Wb + g) / C, cell = p - g;
    if (cell < 46) break;
    if (cell > 260) continue;
    const gap = Math.max(g, Math.min(cell * 0.25, 2 * g)); // between the book and the diary: a little more than a gutter
    // The two works side by side in cw columns and a given height, the same height, as a pair in the middle.
    const fit = (cw, height) => {
      const span = cw * p - g, h = Math.min(height, (span - gap) / (ab + ad));
      return [h, span - gap - h * (ab + ad)];
    };
    const rate = (o) => {
      const tall = o.rh / cell; // a band's rows are spaced by eye, so there a row may be taller than its cells are wide
      let s = 1.6 * Math.abs(Math.log(cell / target));
      s += o.mode === 'band' ? 3 * Math.max(0, Math.log(0.9 / tall), Math.log(tall / 1.4)) : 3 * Math.abs(Math.log(tall));
      s += 8 * Math.max(0, (o.mode === 'band' ? 0.3 : 0.55) - o.hw / Hb) + 4 * Math.max(0, o.hw / Hb - 0.72);
      s += 1.5 * Math.max(0, 2.3 - o.hw / o.rh);
      s += 5 * (o.spare / Hb) + 3 * (o.spareW / Wb); // room left around the works in their block
      if (o.sides === 1) s += 0.35;
      return s;
    };

    // A: the works lie across the whole width, in a band of their own, with rows above and below.
    {
      const [hw] = fit(C, Infinity);
      for (let n = 1; n <= 5; n++) {
        const q = (Hb - hw) / (2 * n), rh = q - g;
        if (rh < 40 || 2 * n * (C + 1) > collection.length) continue;
        const o = { mode: 'band', Hb, C, R: 2 * n, n, g, gap, p, q, cell, rh, hw, spare: 0, spareW: 0, sides: 0, x0, y0 };
        o.score = rate(o);
        consider(o);
      }
    }
    // B: the works take a block of cells in the middle of the grid, with cells all round (or at the sides).
    for (let R = 2; R <= 10; R++) {
      const q = (Hb + g) / R, rh = q - g;
      if (rh < 40) break;
      if (R * (C + 1) > collection.length) break;
      for (let rw = 1; rw <= R; rw++) {
        if ((R - rw) % 2) continue;
        const height = rw * q - g;
        for (let cw = C - 2; cw >= 1; cw -= 2) {
          const [hw, spareW] = fit(cw, height);
          const o = { mode: 'block', Hb, C, R, rw, cw, g, gap, p, q, cell, rh, hw, spare: height - hw, spareW, sides: (C - cw) / 2, x0, y0 };
          o.score = rate(o);
          consider(o);
        }
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------- laying it out

let L = null; // the current plan
let rows = []; // { el, items, dir, start, base, windows }
const starts = []; // where in its stretch of the collection each row begins; kept across resizes

// Cut the collection into one stretch per row, each long enough to slide (at least one more than the row has
// cells), preferring cuts between drawers, rows of drawings of much the same height (so a row of poop is not
// spaced for lizards), and the cut below the book between the animals and the lizards.
function deal(R, C, above, heights) {
  const N = collection.length, least = C + 1, ideal = N / R;
  const sum = [0], squares = [0];
  heights.forEach((h, i) => { sum.push(sum[i] + h); squares.push(squares[i] + h * h); });
  const spread = (j, i) => { const n = i - j, mean = (sum[i] - sum[j]) / n; return Math.sqrt(Math.max(0, (squares[i] - squares[j]) / n - mean * mean)) / mean; };
  const cost = Array.from({ length: R + 1 }, () => new Array(N + 1).fill(Infinity));
  const from = Array.from({ length: R + 1 }, () => new Array(N + 1).fill(0));
  cost[0][0] = 0;
  for (let r = 1; r <= R; r++) for (let i = r * least; i <= N; i++) for (let j = (r - 1) * least; j <= i - least; j++) {
    if (cost[r - 1][j] === Infinity) continue;
    let c = cost[r - 1][j] + 0.3 * ((i - j - ideal) ** 2) / ideal + 6 * spread(j, i);
    if (i < N && !breaks.has(i)) c += 4;
    if (r === above && i === within) c -= 3;
    if (c < cost[r][i]) { cost[r][i] = c; from[r][i] = j; }
  }
  const cuts = [N];
  for (let r = R, i = N; r > 0; r--) { i = from[r][i]; cuts.unshift(i); }
  return cuts.slice(0, -1).map((a, r) => collection.slice(a, cuts[r + 1]));
}

function layout(at = 0) {
  const W = wall.clientWidth, H = wall.clientHeight, cs = getComputedStyle(shelf);
  const inset = { top: parseFloat(cs.paddingTop), right: parseFloat(cs.paddingRight), bottom: parseFloat(cs.paddingBottom), left: parseFloat(cs.paddingLeft) };
  L = plan(W, H, inset);
  if (!L) { // a window too small for any plate: the works as the stylesheet lays them out, and no drawings
    document.body.classList.remove('plated');
    wall.replaceChildren();
    rows = [];
    return;
  }
  offset = at * L.p;
  const { mode, C, R, g, p, q, cell, rh, hw, x0, y0, Hb } = L;
  const colX = c => x0 + c * p;
  const count = mode === 'band' ? 2 * L.n : R;

  // Size every drawing for these cells: by its kind, never a speck, never out of its cell.
  const size = new Map(collection.map(d => {
    const fill = Math.min(cell / d.w, rh / d.h);
    const s = Math.max(fill * d.presence, Math.min(fill, Math.min(cell * 0.5, 40) / Math.max(d.w, d.h)));
    return [d, [d.w * s, d.h * s]];
  }));
  const stretches = deal(count, C, Math.floor(count / 2), collection.map(d => size.get(d)[1]))
    .map(list => list.map(d => ({ d, w: size.get(d)[0], h: size.get(d)[1] })));
  const fw = Math.max(44, Math.min(cell * 0.92, rh * FACE)), fh = fw / FACE; // the face, in the last row
  // A row is about as tall as most of its drawings; the odd tall one is brought down a little to match.
  const quantile = (list, f) => { const h = list.map(i => i.h).sort((a, b) => a - b); return h[Math.min(h.length - 1, Math.floor(h.length * f))]; };
  for (const list of stretches) {
    const most = quantile(list, 0.5) * 1.6;
    for (const i of list) if (i.h > most) { i.w *= most / i.h; i.h = most; }
  }
  const tallest = stretches.map((list, r) => Math.max(...list.map(i => i.h), r === count - 1 ? fh : 0));
  const typical = stretches.map(list => quantile(list, 0.7));

  // Where each row stands (its baseline), and the block or band the works lie in.
  let bases, block; // block: [col from, col to, top, bottom, row from, row to]
  if (mode === 'band') {
    // The rows are spaced by eye: from each baseline down to the top of the next row's typical drawing (or to
    // the top of the works) is the same distance all the way down, so small things do not leave holes.
    const n = L.n, clear = g * 0.6;
    const run = G => {
      const b = [y0 + tallest[0]];
      for (let r = 1; r < count; r++) {
        const from = r === n ? b[n - 1] + G + hw : b[r - 1];
        b.push(from + Math.max(G + typical[r], clear + tallest[r]));
      }
      return b;
    };
    let lo = 0, hi = Hb;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (run(mid)[count - 1] > y0 + Hb) hi = mid; else lo = mid; }
    const G = Math.min(lo, Math.max(2.6 * g, cell * 0.42));
    bases = run(G);
    const spare = (y0 + Hb - bases[count - 1]) / 2; // more room than even gaps should take: the plate sits in the middle
    bases = bases.map(b => b + spare);
    block = [0, C, bases[n - 1] + G, bases[n - 1] + G + hw, -1, -1];
  } else {
    bases = Array.from({ length: R }, (_, r) => y0 + r * q + rh);
    const r0 = (R - L.rw) / 2, c0 = (C - L.cw) / 2;
    block = [c0, c0 + L.cw, y0 + r0 * q, bases[r0 + L.rw - 1], r0, r0 + L.rw];
  }
  const [c0, c1, , bBottom] = block;

  // The works: the same height, standing side by side on the bottom of their block, in the middle of it.
  const sizes = ASPECT.map(a => [a * hw, hw]);
  const left = colX(c0) + ((c1 - c0) * p - g - sizes[0][0] - sizes[1][0] - L.gap) / 2;
  const xs = [left, left + sizes[0][0] + L.gap];
  works.forEach((a, i) => {
    Object.assign(a.style, { left: `${xs[i].toFixed(1)}px`, top: `${(bBottom - hw).toFixed(1)}px`, width: `${sizes[i][0].toFixed(1)}px`, height: `${hw.toFixed(1)}px` });
  });

  // The face: a specimen too, standing in the first cell of the last row.
  Object.assign(nav.style, { left: `${(colX(0) + (cell - fw) / 2).toFixed(1)}px`, bottom: `${(H - bases[count - 1]).toFixed(1)}px`, top: 'auto' });
  nav.style.setProperty('--face', `${fw.toFixed(1)}px`);

  // Which cells of each row show: all but those under the works and the face.
  const els = [];
  rows = bases.map((base, r) => {
    const covered = c => (c === 0 && r === count - 1) || (mode === 'block' && r >= block[4] && r < block[5] && c >= c0 && c < c1);
    const windows = [];
    for (let c = 0; c < C; c++) {
      if (covered(c)) continue;
      if (windows.length && windows[windows.length - 1][1] === c) windows[windows.length - 1][1] = c + 1;
      else windows.push([c, c + 1]);
    }
    const el = document.createElement('div');
    el.className = 'drawer';
    // The rows show through windows that end halfway across the gutters, so nothing is cut at rest. A hop may
    // rise above the row.
    const yA = base - tallest[r] - rh, yB = base + g / 2;
    el.style.clipPath = windows.length ? `path("${windows.map(([a, b]) => {
      const xa = colX(a) - g / 2, xb = colX(b) - g / 2;
      return `M${xa.toFixed(1)} ${yA.toFixed(1)}H${xb.toFixed(1)}V${yB.toFixed(1)}H${xa.toFixed(1)}Z`;
    }).join('')}")` : 'inset(50%)';
    if (starts[r] === undefined) starts[r] = Math.floor(Math.random() * 1000);
    const items = stretches[r].map(({ d, w, h }, k) => {
      let img = pictures.get(d.name);
      if (!img) {
        img = new Image();
        img.alt = '';
        img.className = 'sprite';
        img.draggable = false;
        img.dataset.src = `${folder}${d.name}.webp`;
        pictures.set(d.name, img);
      }
      img.style.width = `${w.toFixed(1)}px`;
      img.style.height = `${h.toFixed(1)}px`;
      el.append(img);
      return { img, d, k, dx: (cell - w) / 2, y: base - h, h };
    });
    els.push(el);
    return { el, items, dir: r % 2 ? -1 : 1, start: starts[r], base, windows };
  });
  wall.replaceChildren(...els);
  document.body.classList.add('plated');
  place(true);
  if (layouts) return; // laid out again for a new window size: no second arrival
  // They are laid out in a wave from the top left once the ones on show have loaded (or a moment has passed).
  const showing = [...wall.querySelectorAll('.sprite[src]')].map(img => img.decode().catch(() => {}));
  layouts++;
  Promise.race([Promise.all(showing), new Promise(done => setTimeout(done, 700))]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    wall.classList.add('ready');
    settling = setTimeout(() => wall.classList.add('settled'), 1600); // all arrived: from now on they answer at once
  })));
}
let layouts = 0, settling;
const pictures = new Map(); // one img for each drawing, kept from one layout to the next

// ---------------------------------------------------------------- sliding

let offset = 0; // how far the rows have slid, in pixels: even rows to the right, odd rows to the left

function place(first = false) {
  const { p, x0 } = L;
  for (const row of rows) {
    const n = row.items.length, shift = row.dir * offset / p;
    for (const item of row.items) {
      let c = mod(item.k + row.start + shift, n);
      if (c > n - 1) c -= n; // the last place is just off the left end, so a drawing slides in from there
      const x = x0 + c * p + item.dx;
      item.img.style.translate = `${x.toFixed(1)}px ${item.y.toFixed(1)}px`;
      const shows = row.windows.some(([a, b]) => c > a - 1 && c < b);
      if (shows && !item.img.src) item.img.src = item.img.dataset.src;
      if (first) item.img.style.setProperty('--i', shows ? Math.round(c + rows.indexOf(row) * 0.8) : 0);
    }
  }
}

let frame = 0, velocity = 0, target = null;
const cells = () => offset / L.p;
// Let go: the rows run on for a moment and settle on the nearest whole cell in the direction they were going
// (or on the cell given).
function settle(v = 0, goal = Math.round((offset + v * 9) / L.p) * L.p) {
  velocity = v;
  target = goal;
  cancelAnimationFrame(frame);
  if (calm.matches) { offset = target; place(); target = null; return; }
  const step = () => {
    velocity = velocity * 0.74 + (target - offset) * 0.07;
    offset += velocity;
    if (Math.abs(target - offset) < 0.3 && Math.abs(velocity) < 0.3) { offset = target; target = null; place(); return; }
    place();
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

let queued = false;
function move() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; place(); });
}

// One face looks out of the corner. Stir far enough and the other takes its place; the first one (Lucas) is
// there to begin with and stays about three times as long.
const stay = () => (faces[0].classList.contains('on') ? 14 : 5) * (0.7 + Math.random() * 0.6); // in cells
let passed = 0, enough = faces.length > 1 ? stay() : Infinity, lastCell = 0;
function counted() {
  const now = Math.round((target ?? offset) / L.p);
  passed += Math.abs(now - lastCell);
  lastCell = now;
  if (passed < enough) return;
  for (const face of faces) face.classList.toggle('on');
  passed = 0;
  enough = stay();
}

// Reduced motion: no sliding, the rows step a whole cell at a time.
let owed = 0;
function stir(by) {
  if (!L) return;
  if (calm.matches) {
    owed += by;
    if (Math.abs(owed) < L.p * 0.5) return;
    offset += Math.sign(owed) * L.p;
    owed = 0;
    place();
  } else {
    offset += by;
    move();
  }
  counted();
}

let last = null, lastAt = 0, speed = 0, travelled = 0;
addEventListener('pointerdown', e => {
  cancelAnimationFrame(frame);
  target = null;
  last = [e.clientX, e.clientY];
  lastAt = e.timeStamp;
  speed = 0;
  travelled = 0;
});
addEventListener('pointermove', e => {
  if (last === null) return;
  const dx = e.clientX - last[0], dy = last[1] - e.clientY;
  const by = Math.abs(dx) > Math.abs(dy) ? dx : dy; // up, or to the right, slides the rows the same way
  const dt = Math.max(1, e.timeStamp - lastAt);
  speed = speed * 0.4 + (by / dt) * 16 * 0.6; // pixels a frame
  travelled += Math.abs(by);
  last = [e.clientX, e.clientY];
  lastAt = e.timeStamp;
  stir(by);
});
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, e => {
  if (last === null) return;
  last = null;
  if (e.timeStamp - lastAt > 90 || calm.matches) speed = 0; // held still before letting go
  if (L && (travelled > 2 || offset % L.p)) settle(clamp(-60, speed, 60));
});
// The wheel: a mouse wheel's click moves the rows on by one cell; a trackpad slides them, and they settle when it stops.
let idle;
addEventListener('wheel', e => {
  const by = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (!by || !L) return;
  const notch = e.deltaMode !== 0 || (Math.abs(by) >= 50 && Number.isInteger(by));
  if (notch && !calm.matches) {
    settle(velocity, (target ?? Math.round(cells()) * L.p) + Math.sign(by) * L.p);
    counted();
    return;
  }
  stir(by * 0.8);
  clearTimeout(idle);
  idle = setTimeout(() => settle(0), 140);
}, { passive: true });

// ---------------------------------------------------------------- poking

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

// Poke a drawing: it gives under the finger, then springs straight up and lands on its line again,
// and its neighbours in the rows around it jump a little after it.
function hop(img, wait, height) {
  img.style.setProperty('--wait', `${wait}ms`);
  img.style.setProperty('--jump', `${-height}px`);
  img.classList.remove('hop');
  void img.offsetWidth; // restart the animation
  img.classList.add('hop');
}
const centre = img => { const r = img.getBoundingClientRect(); return [r.left + r.width / 2, r.bottom]; };
let pressed;
wall.addEventListener('pointerdown', e => {
  if (!e.target.classList.contains('sprite')) return;
  pressed = e.target;
  pressed.classList.add('press');
});
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => pressed?.classList.remove('press'));
wall.addEventListener('click', e => {
  if (!e.target.classList.contains('sprite') || travelled > 8) return;
  const [x, y] = centre(e.target), reach = L.p * 1.6;
  for (const { items } of rows) for (const { img } of items) {
    if (!img.src) continue;
    const [x2, y2] = centre(img), far = Math.hypot(x2 - x, (y2 - y) * 1.2);
    if (img === e.target) hop(img, 0, Math.min(L.rh * 0.45, img.offsetHeight * 0.7 + 12));
    else if (far < reach) hop(img, 50 + far * 0.9, L.rh * 0.2 * (1 - far / reach) + 4);
  }
  tick();
});
wall.addEventListener('animationend', e => e.target.classList.remove('hop'));

// ---------------------------------------------------------------- the window changing

let timer, size = [0, 0];
addEventListener('resize', () => {
  const now = [wall.clientWidth, wall.clientHeight];
  if (Math.abs(now[0] - size[0]) < 2 && Math.abs(now[1] - size[1]) < 2) return;
  clearTimeout(timer);
  timer = setTimeout(() => { size = now; layout(Math.round(cells())); }, 160);
});
size = [wall.clientWidth, wall.clientHeight];
layout();
