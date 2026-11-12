// The shelf, direction 1: a tidy collage. The cut-out drawings are laid around the book and the diary
// with care: all at one scale, in proportion to each other; the same breathing space between any two of
// them and between them and the works; none under the works, none cut by the edge of the window; most
// upright, a few leaning in towards the works. Nothing moves until it is touched.
// A swipe (or the wheel) stirs them: a wave runs across the garden with the finger, and every drawing
// it passes gives way to another that fills the same space. Poke one and it hops, and its neighbours too.
const wall = document.querySelector('.wall');
const shelf = document.querySelector('.shelf');
const folder = wall.dataset.src;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const mod = (a, n) => ((a % n) + n) % n;

// How big each drawing is next to the others, as a share of its size in pixels. They were drawn at
// different sizes; this puts them in one world, where a lizard is the largest creature and a fly is small.
const SIZE = {
  'lizard-walking-tongue-out': .8,
  'fly-purple-front': .5, 'slug-big-yellow-green': .6, 'spider-teal': .62, 'cat-grey-purple': 1.25, 'mouse-sitting-orange': .9,
  'microbe-dancing-pair-leaning': .62, 'microbe-dancing-pair-upright': .62, 'microbe-rods-mustard': .62,
  'microbe-branched-magenta': .7, 'microbe-spiral-yellow': .7, 'microbe-chain-blue': .72,
  'shrub-buds-mauve': .5, 'sprig-buds-olive': .46, 'branch-blossoms-pink': .56, 'flowers-purple-pair': .68,
  'flower-pink-on-stem': .74, 'flower-head-blue': 1.1, 'flower-head-orange': 1.1, 'flower-head-pink': 1.1, 'stem-forked-green-buds': .72, 'branch-stump-brown': .72,
  'stone-wall-purple': .62, 'poop-on-green-plant': .72, 'poop-tiny': 1.2, 'poop-small-ragged': 1.15, 'poop-tiny-tall': 1.15,
};
const KIND = { microbe: .8, poop: .85, plant: .9 };
// The ones that may lean; the rest always stand upright. A few of them lean, by one small angle, towards the works.
const LEANS = new Set(['microbe', 'lizard', 'bug']);
const LEAN = 12;

// Drawings too alike to be seen together (mirror images, the same thing in another colour), and kinds
// of which one at a time is enough on a small screen.
const FAMILIES = ['lizard', 'microbe-dancing-pair', 'microbe-spiral-green', 'mushrooms-orange', 'slug-hat', 'flower-head',
  'microbe-star', 'grass', 'butterfly', 'snail', 'worm', 'fly'];
const TWINS = new Set(['microbe-dancing-pair', 'microbe-spiral-green', 'mushrooms-orange', 'slug-hat']);
const family = name => (name.startsWith('poop-') && !name.includes('plant') ? 'poop' : /^(grass-curl|sprout-curl)/.test(name) ? 'curl'
  : FAMILIES.find(f => name.startsWith(f)) ?? name);

// Left out: the rings. In the book they are halos around something; on their own they read as a scribble.
const drawings = JSON.parse(wall.dataset.sprites).filter(([, , , , kind]) => kind !== 'ring').map(([name, w, h, , kind]) =>
  ({ name, w, h, kind, f: SIZE[name] ?? KIND[kind] ?? 1, family: family(name) }));

// Pictures, loaded once.
const pictures = new Map();
function load(d) {
  if (!pictures.has(d.name)) {
    const img = new Image();
    img.src = `${folder}${d.name}.webp`;
    pictures.set(d.name, img.decode().then(() => img, () => null));
  }
  return pictures.get(d.name);
}

// ---------------------------------------------------------------- the grid the drawings are laid out on

// The window as a grid of small squares. `used` counts what covers each square: the works, the face and
// the margins, and every drawing with its breathing space around it. `room` is how far each square is
// from the nearest covered one, so the emptiest places can be found.
let g; // { cell, cols, rows, gap, used, room, most }

function grid(width, height, cell, gap) {
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  g = { cell, cols, rows, gap, used: new Uint16Array(cols * rows), room: new Float32Array(cols * rows), most: 0 };
}

// Cover everything outside the rectangle (in pixels) that drawings may use.
function keepInside(left, top, right, bottom) {
  const { cell, cols, rows, used } = g;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x * cell < left || (x + 1) * cell > right || y * cell < top || (y + 1) * cell > bottom) used[y * cols + x] = 1;
  }
}
function cover(left, top, right, bottom) {
  const { cell, cols, rows, used } = g;
  for (let y = Math.max(0, Math.floor(top / cell)); y < Math.min(rows, Math.ceil(bottom / cell)); y++)
    for (let x = Math.max(0, Math.floor(left / cell)); x < Math.min(cols, Math.ceil(right / cell)); x++) used[y * cols + x] = 1;
}

// Distance from each free square to the nearest covered one (two passes, diagonal steps cost 1.4).
function measure() {
  const { cols, rows, used, room } = g;
  for (let i = 0; i < room.length; i++) room[i] = used[i] ? 0 : 1e6;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x;
    if (!room[i]) continue;
    let r = room[i];
    if (x > 0) r = Math.min(r, room[i - 1] + 1);
    if (y > 0) {
      r = Math.min(r, room[i - cols] + 1);
      if (x > 0) r = Math.min(r, room[i - cols - 1] + 1.4);
      if (x < cols - 1) r = Math.min(r, room[i - cols + 1] + 1.4);
    }
    room[i] = r;
  }
  for (let y = rows - 1; y >= 0; y--) for (let x = cols - 1; x >= 0; x--) {
    const i = y * cols + x;
    if (!room[i]) continue;
    let r = room[i];
    if (x < cols - 1) r = Math.min(r, room[i + 1] + 1);
    if (y < rows - 1) {
      r = Math.min(r, room[i + cols] + 1);
      if (x < cols - 1) r = Math.min(r, room[i + cols + 1] + 1.4);
      if (x > 0) r = Math.min(r, room[i + cols - 1] + 1.4);
    }
    room[i] = r;
  }
  g.most = 0;
  for (let i = 0; i < room.length; i++) if (room[i] > g.most) g.most = room[i];
}

// A drawing as the grid sees it, at the size and angle it will be shown: the squares its ink touches,
// those of them on its outline, and its ink grown by the breathing space.
const canvas = document.createElement('canvas');
const pen = canvas.getContext('2d', { willReadFrequently: true });
function shape(img, w, h, tilt) {
  const { cell, gap } = g;
  const a = tilt * Math.PI / 180, cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
  const cols = Math.ceil((w * cos + h * sin) / cell) + 1, rows = Math.ceil((w * sin + h * cos) / cell) + 1;
  canvas.width = cols;
  canvas.height = rows;
  pen.setTransform(1, 0, 0, 1, cols / 2, rows / 2);
  pen.rotate(a);
  pen.drawImage(img, -w / cell / 2, -h / cell / 2, w / cell, h / cell);
  const alpha = pen.getImageData(0, 0, cols, rows).data;
  const ink = new Uint8Array(cols * rows);
  for (let i = 0; i < ink.length; i++) ink[i] = alpha[i * 4 + 3] > 28;
  const cells = [], edge = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!ink[y * cols + x]) continue;
    cells.push(x, y);
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 || !ink[y * cols + x - 1] || !ink[y * cols + x + 1] ||
        !ink[(y - 1) * cols + x] || !ink[(y + 1) * cols + x]) edge.push(x, y);
  }
  // The ink grown by the gap: no other drawing's ink may come into it.
  const r = Math.max(1, Math.round(gap / cell)), hw = cols + 2 * r, hh = rows + 2 * r, halo = new Uint8Array(hw * hh);
  const disc = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) disc.push(dx, dy);
  for (let i = 0; i < edge.length; i += 2) {
    const ex = edge[i] + r, ey = edge[i + 1] + r;
    for (let j = 0; j < disc.length; j += 2) halo[(ey + disc[j + 1]) * hw + ex + disc[j]] = 1;
  }
  for (let i = 0; i < cells.length; i += 2) halo[(cells[i + 1] + r) * hw + cells[i] + r] = 1;
  const grown = [];
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) if (halo[y * hw + x]) grown.push(x - r, y - r);
  return { cols, rows, cells, edge, grown, tilt, ink };
}

function fits(s, px, py) {
  const { cols, rows, used } = g;
  if (px < 0 || py < 0 || px + s.cols > cols || py + s.rows > rows) return false;
  const c = s.cells;
  for (let i = 0; i < c.length; i += 2) if (used[(py + c[i + 1]) * cols + px + c[i]]) return false;
  return true;
}
// How much room is left around it: the narrowest gap between its outline and anything else.
function clearance(s, px, py) {
  const { cols, room } = g, e = s.edge;
  let least = Infinity;
  for (let i = 0; i < e.length; i += 2) least = Math.min(least, room[(py + e[i + 1]) * cols + px + e[i]]);
  return least;
}
function mark(s, px, py, by) {
  const { cols, rows, used } = g, c = s.grown;
  for (let i = 0; i < c.length; i += 2) {
    const x = px + c[i], y = py + c[i + 1];
    if (x >= 0 && y >= 0 && x < cols && y < rows) used[y * cols + x] += by;
  }
}

// ---------------------------------------------------------------- laying the drawings out

let items = [], pool = [], scale = 1, centre = 0, started = 0, gen = 0, smallest = 26, target = 0;

function sizeOf(d) { return [d.w * d.f * scale, d.h * d.f * scale]; }

// Its colour on the whole, so that two of a colour are not put side by side.
function colour(img) {
  canvas.width = canvas.height = 12;
  pen.drawImage(img, 0, 0, 12, 12);
  const p = pen.getImageData(0, 0, 12, 12).data, sum = [0, 0, 0, 0];
  for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 4; c++) sum[c] += c < 3 ? p[i + c] * p[i + 3] : p[i + 3];
  return sum.slice(0, 3).map(v => v / (sum[3] || 1));
}

// The shapes a drawing can take: upright, or leaning left or right if it is one that leans.
// About a third of those that may lean do, always towards the works.
async function shapes(d) {
  const img = await load(d);
  if (!img) return null;
  const [w, h] = sizeOf(d);
  d.rgb ??= colour(img);
  if (d.lean === undefined) d.lean = LEANS.has(d.kind) && Math.random() < .3;
  return d.lean ? { d, img, w, h, left: shape(img, w, h, -LEAN), right: shape(img, w, h, LEAN) } : { d, img, w, h, up: shape(img, w, h, 0) };
}

// Next to a drawing of much the same colour, or of the same family, a place counts as less roomy.
function crowding(forms, cx, cy) {
  let penalty = 0;
  const size = Math.max(forms.w, forms.h), { d } = forms;
  for (const item of items) {
    const reach = (size + Math.max(item.w, item.h)) / 2 + g.gap * 2.5, far = Math.hypot(item.cx - cx, item.cy - cy);
    if (far >= reach) continue;
    const likeness = Math.max(item.d.family === d.family ? 1 : 0, 1 - Math.hypot(...item.d.rgb.map((v, i) => v - d.rgb[i])) / 80);
    if (likeness > 0) penalty += 3 * likeness * (1 - far / reach);
  }
  return penalty;
}
// No more of a family than one in eighteen (one of twins), and no kind much above its share of the whole set,
// so that every view has a bit of everything: plants, creatures, microbes, the odd poop.
const share = {};
for (const d of drawings) share[d.kind] = (share[d.kind] ?? 0) + 1 / drawings.length;
const allowed = d => {
  const family = items.filter(item => item.d.family === d.family).length, kind = items.filter(item => item.d.kind === d.kind).length;
  return family < (TWINS.has(d.family) ? 1 : 1 + Math.floor(items.length / 18)) && kind < 1 + items.length * share[d.kind] * 1.4;
};
const pick = (forms, px) => forms.up ?? ((px + forms.right.cols / 2) * g.cell < centre ? forms.right : forms.left);

// Where it has the most room: try many places, keep the best, then nudge it to the middle of its gap.
function find(forms, near) {
  const { cols, room } = g;
  let best = null, bestScore = -Infinity;
  const spots = [];
  if (near) {
    for (let k = 0; k < 90; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * near.r;
      spots.push(Math.round(near.x + Math.cos(a) * r), Math.round(near.y + Math.sin(a) * r));
    }
  } else {
    // Only where there is some room at all.
    const open = [];
    for (let i = 0; i < room.length; i++) if (room[i] >= 2) open.push(i);
    if (!open.length) return null;
    for (let k = 0; k < 260; k++) {
      const i = open[(Math.random() * open.length) | 0];
      spots.push(i % cols, (i / cols) | 0);
    }
  }
  for (let k = 0; k < spots.length; k += 2) {
    const s0 = pick(forms, spots[k]);
    const px = spots[k] - (s0.cols >> 1), py = spots[k + 1] - (s0.rows >> 1);
    const s = pick(forms, px);
    if (!fits(s, px, py)) continue;
    const score = clearance(s, px, py) - crowding(forms, (px + s.cols / 2) * g.cell, (py + s.rows / 2) * g.cell);
    if (score > bestScore) { best = [px, py, s]; bestScore = score; }
  }
  if (!best) return null;
  for (const step of [3, 2, 1, 1]) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const px = best[0] + dx, py = best[1] + dy, s = pick(forms, px);
        if (!fits(s, px, py)) continue;
        const score = clearance(s, px, py) - crowding(forms, (px + s.cols / 2) * g.cell, (py + s.rows / 2) * g.cell);
        if (score > bestScore + .01) { best = [px, py, s]; bestScore = score; moved = true; }
      }
    }
  }
  return best;
}

function put(d, forms, [px, py, s], delay = 0) {
  if (calm.matches) delay = 0;
  mark(s, px, py, 1);
  measure();
  const { cell } = g, img = forms.img.cloneNode();
  const cx = (px + s.cols / 2) * cell, cy = (py + s.rows / 2) * cell;
  img.alt = '';
  img.className = 'sprite';
  img.draggable = false;
  img.style.width = `${forms.w.toFixed(1)}px`;
  img.style.translate = `${(cx - forms.w / 2).toFixed(1)}px ${(cy - forms.h / 2).toFixed(1)}px`;
  if (s.tilt) img.style.rotate = `${s.tilt}deg`;
  img.style.setProperty('--delay', `${delay}ms`);
  wall.append(img);
  const item = { d, img, s, px, py, cx, cy, w: forms.w, h: forms.h, born: performance.now() };
  items.push(item);
  requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('in')));
  setTimeout(() => img.style.removeProperty('--delay'), delay + 700);
  return item;
}

function lift(item) {
  mark(item.s, item.px, item.py, -1);
  measure();
  items.splice(items.indexOf(item), 1);
  item.img.classList.add('out');
  setTimeout(() => item.img.remove(), 400);
}

async function scatter() {
  const mine = ++gen;
  items = [];
  wall.replaceChildren();
  const width = wall.clientWidth, height = wall.clientHeight;
  const pad = getComputedStyle(shelf);
  const [top, right, bottom, left] = ['Top', 'Right', 'Bottom', 'Left'].map(side => parseFloat(pad[`padding${side}`]) || 0);
  const book = document.querySelector('.work.book'), diary = document.querySelector('.work.diary');
  const faces = document.querySelector('.faces');
  // One scale for every drawing, in proportion to the book.
  scale = Math.min(.8, Math.max(.2, book.offsetHeight / 1250));
  // The same breathing space between any two drawings; a little more around the works, a little less at the edge.
  const gap = Math.max(13, 72 * scale), cell = Math.max(3, Math.round(gap / 5));
  grid(width, height, cell, gap);
  const margin = gap * .8, moat = gap * 1.2, shadow = book.offsetWidth * .03;
  keepInside(left + margin, top + margin, width - right - margin, height - bottom - margin);
  for (const el of [book, diary])
    cover(el.offsetLeft - moat, el.offsetTop - moat, el.offsetLeft + el.offsetWidth + moat + shadow, el.offsetTop + el.offsetHeight + moat + shadow);
  cover(faces.offsetLeft - gap, faces.offsetTop - gap, faces.offsetLeft + faces.offsetWidth + gap, faces.offsetTop + faces.offsetHeight + gap);
  smallest = Math.max(28, gap * 1.6);
  centre = (Math.min(book.offsetLeft, diary.offsetLeft) + Math.max(book.offsetLeft + book.offsetWidth, diary.offsetLeft + diary.offsetWidth)) / 2;
  measure();

  // One lizard first: the book is about her. Then the largest, more or less, so that the small ones fill in
  // around them; a third of the drawings sit this visit out, so the big ones are not always the same.
  const lizards = drawings.filter(d => d.kind === 'lizard'), hero = lizards[(Math.random() * lizards.length) | 0];
  pool = drawings.filter(d => d !== hero && Math.random() < .3);
  const deck = [hero, ...drawings.filter(d => d !== hero && !pool.includes(d))
    .map(d => ({ d, k: d.w * d.f * d.h * d.f * (.25 + Math.random() * 1.5) })).sort((a, b) => b.k - a.k).map(x => x.d)];
  for (const d of drawings) delete d.lean;
  started = performance.now();
  let misses = 0, n = 0, slice = performance.now();
  const later = [];
  deck.slice(0, 24).forEach(load);
  for (let i = 0; i < deck.length + later.length; i++) {
    const d = i < deck.length ? deck[i] : later[i - deck.length];
    if (deck[i + 24]) load(deck[i + 24]);
    if (misses > 40) { pool.push(d); continue; }
    const [w, h] = sizeOf(d);
    if (Math.max(w, h) < smallest) { pool.push(d); continue; }
    if (!allowed(d)) { (i < deck.length ? later : pool).push(d); continue; } // perhaps once there are more of the others
    // Skip, without loading it, a drawing too big for the largest gap left.
    if (Math.min(w, h) / g.cell / 2 > g.most * 1.25 || w / g.cell > g.cols || h / g.cell > g.rows) { pool.push(d); misses++; continue; }
    const forms = await shapes(d);
    if (mine !== gen) return;
    const spot = forms && find(forms);
    if (!spot) { pool.push(d); misses++; continue; }
    misses = 0;
    put(d, forms, spot, Math.max(0, started + 160 + n++ * 45 - performance.now()));
    if (performance.now() - slice > 12) { // let a frame through now and then
      await new Promise(requestAnimationFrame);
      if (mine !== gen) return;
      slice = performance.now();
    }
  }
  pool.sort(() => Math.random() - .5);
  target = items.length; // stirring keeps about this many
}

// ---------------------------------------------------------------- stirring

// One drawing gives way to another of the same kind and about its size, in the same space (a lizard
// always to a lizard), so the mix stays as it was. If the newcomer is smaller and leaves a hole big
// enough for one more, one more comes.
let chain = Promise.resolve(), recent = [];
function renew(item) {
  chain = chain.then(async () => {
    if (!items.includes(item)) return;
    const mine = gen;
    lift(item);
    recent = [item.d, ...recent].slice(0, 8);
    const area = item.w * item.h, kind = item.d.kind;
    const near = { x: item.px + item.s.cols / 2, y: item.py + item.s.rows / 2, r: Math.max(item.s.cols, item.s.rows) * .45 + 2 };
    const options = pool.filter(d => !recent.includes(d) && (kind !== 'lizard' || d.kind === kind) && Math.max(...sizeOf(d)) >= smallest && allowed(d))
      .map(d => {
        const [w, h] = sizeOf(d), ratio = Math.log(w * h / area);
        return { d, k: (d.kind === kind ? 0 : .6) + (ratio > 0 ? ratio * 1.4 : -ratio) + Math.random() * .3 };
      }).sort((a, b) => a.k - b.k).slice(0, 12);
    pool.push(item.d);
    let placed = false;
    // A lizard that finds no room where the last one was may go wherever there is room; if there is none,
    // the same lizard comes back.
    for (const anywhere of kind === 'lizard' ? [false, true] : [false]) {
      for (const { d } of options) {
        const forms = await shapes(d);
        if (mine !== gen) return;
        const spot = forms && find(forms, anywhere ? null : near);
        if (!spot) continue;
        pool.splice(pool.indexOf(d), 1);
        put(d, forms, spot, 90);
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed && kind === 'lizard') {
      const forms = await shapes(item.d);
      if (mine !== gen) return;
      pool.splice(pool.indexOf(item.d), 1);
      put(item.d, forms, [item.px, item.py, item.s], 90);
    }
    await fill(mine);
  }).catch(() => {});
}

async function fill(mine) {
  const room = g.most * g.cell * 2; // across the largest hole
  if (items.length >= target || room < smallest * 1.1) return;
  const options = pool.filter(d => !recent.includes(d) && allowed(d)).map(d => ({ d, size: sizeOf(d) }))
    .filter(({ size }) => Math.max(...size) >= smallest && Math.min(...size) <= room * 1.2)
    .sort((a, b) => b.size[0] * b.size[1] * (.6 + Math.random() * .8) - a.size[0] * a.size[1] * (.6 + Math.random() * .8)).slice(0, 6);
  for (const { d } of options) {
    const forms = await shapes(d);
    if (mine !== gen) return;
    const spot = forms && find(forms);
    if (!spot) continue;
    pool.splice(pool.indexOf(d), 1);
    put(d, forms, spot, 140);
    return;
  }
}

if ('stir' in wall.dataset) {
  let last = null, speed = 0, gliding = 0, wave = null;
  // One face looks out of the corner. Stir far enough and the other takes its place; the first one
  // (Lucas) is there to begin with and stays about three times as long.
  const faces = [...document.querySelectorAll('.faces a')];
  const stay = () => (faces[0].classList.contains('on') ? 1300 : 450) * (0.7 + Math.random() * 0.6);
  let stirred = 0, enough = faces.length > 1 ? stay() : Infinity;
  // The wave runs from `from` to `to` (heights on the screen) and renews what it passes.
  const sweep = (from, to) => {
    const now = performance.now(), lo = Math.min(from, to), hi = Math.max(from, to);
    for (const item of [...items]) if (item.cy >= lo && item.cy < hi && now - item.born > 500) renew(item);
  };
  const stir = by => {
    if (wave !== null) {
      const height = wall.clientHeight, next = wave - by;
      if (next < 0 || next >= height) { sweep(wave, by > 0 ? 0 : height); wave = mod(next, height); sweep(by > 0 ? height : 0, wave); }
      else { sweep(wave, next); wave = next; }
    }
    if ((stirred += Math.abs(by)) < enough) return;
    for (const face of faces) face.classList.toggle('on');
    stirred = 0;
    enough = stay();
  };
  const glide = () => {
    stir(speed);
    speed *= 0.92;
    gliding = Math.abs(speed) > 0.5 ? requestAnimationFrame(glide) : 0;
  };
  // A tap is not a stir: the wave starts once the finger has really moved.
  let from = null;
  addEventListener('pointerdown', e => {
    cancelAnimationFrame(gliding);
    last = null;
    from = e.clientY;
    speed = 0;
  });
  addEventListener('pointermove', e => {
    if (from === null) return;
    if (last === null) {
      if (Math.abs(e.clientY - from) < 10) return;
      last = wave = e.clientY;
    }
    speed = last - e.clientY;
    stir(speed);
    last = e.clientY;
  });
  for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => {
    from = null;
    if (last === null) return;
    last = null;
    if (!calm.matches && Math.abs(speed) > 2) gliding = requestAnimationFrame(glide);
  });
  // The wheel has no finger to follow: its wave comes in from the far edge.
  let wheeled = 0;
  addEventListener('wheel', e => {
    if (performance.now() - wheeled > 600) wave = e.deltaY > 0 ? wall.clientHeight - 1 : 0;
    wheeled = performance.now();
    stir(e.deltaY);
  }, { passive: true });
}

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

// Poke a drawing: it gives under the finger, then springs up, and the ones around it jump too.
function hop(img, wait, height) {
  img.style.setProperty('--wait', `${wait}ms`);
  img.style.setProperty('--jump', `${-height}px`);
  img.style.setProperty('--kick', `${Math.random() < .5 ? -8 : 8}deg`);
  img.classList.remove('hop');
  void img.offsetWidth; // restart the animation
  img.classList.add('hop');
}
// The drawing whose ink is under the finger, or within half a gap of it (closer than that to no other),
// rather than whichever box happens to be on top.
function at(x, y) {
  const { cell, gap } = g, reach = Math.max(1, Math.round(gap / 2 / cell));
  let found = null, best = Infinity;
  for (const item of items) {
    const { s, px, py } = item, gx = Math.floor(x / cell) - px, gy = Math.floor(y / cell) - py;
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
      const cx = gx + dx, cy = gy + dy, far = dx * dx + dy * dy;
      if (far < best && cx >= 0 && cy >= 0 && cx < s.cols && cy < s.rows && s.ink[cy * s.cols + cx]) { found = item; best = far; }
    }
  }
  return found;
}
let pressed;
wall.addEventListener('pointerdown', e => {
  pressed = at(e.clientX, e.clientY)?.img;
  pressed?.classList.add('press');
});
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => pressed?.classList.remove('press'));
wall.addEventListener('click', e => {
  const poked = at(e.clientX, e.clientY);
  if (!poked) return;
  const reach = Math.max(140, 420 * scale);
  for (const item of items) {
    const far = Math.hypot(item.cx - poked.cx, item.cy - poked.cy);
    if (item === poked) hop(item.img, 0, 40 + 30 * scale);
    else if (far < reach) hop(item.img, 60 + far * .8, (20 + 14 * scale) * (1 - far / reach) + 4);
  }
  tick();
});
wall.addEventListener('animationend', e => e.target.classList.remove('hop'));

let size = [innerWidth, innerHeight], timer;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - size[0]) < 2 && Math.abs(innerHeight - size[1]) < 24) return;
  size = [innerWidth, innerHeight];
  gen++; // the works have moved: clear the drawings away at once, and lay them out again once it has settled
  items = [];
  for (const img of wall.children) img.classList.add('out');
  clearTimeout(timer);
  timer = setTimeout(scatter, 200);
});
scatter();
