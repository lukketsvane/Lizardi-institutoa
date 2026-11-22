// The shelf, direction 1: a tidy collage. The cut-out drawings are laid around the book and the diary
// with care: all at one scale, in proportion to each other, and all upright; never under the works, never
// cut by the edge of the window, never closer to each other than one breathing space.
// They are composed, not sprinkled: plants and stones stand on something (the bottom of the garden, or the
// top of the book or the diary), a few at a time, in clumps; the lizard has her poop with her; what flies,
// swims or drifts fills the air around them, more thinly in some places than in others.
// A swipe (or the wheel) stirs them: the ones near the finger are carried along a little and spring back,
// and a wave runs across the garden with the finger, so that every drawing it passes gives way to another.
// Poke one and it hops, and its neighbours too.
const wall = document.querySelector('.wall');
const shelf = document.querySelector('.shelf');
const folder = wall.dataset.src;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const mod = (a, n) => ((a % n) + n) % n;
const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

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

// What a drawing stands on. Plants grow out of something and stones lie on something: they stand on the
// bottom of the garden or on top of a work, never in mid-air (2). Creatures that sit or crawl may stand
// there too, beside a plant (1). Microbes, flying things, and loose leaves and flower heads float (0).
const LOOSE = /^(leaf-|flower-head-|twig-with-leaves)/;
const SITS = /^(frog|mouse|cat|bird-purple-perched|snail|slug|bug-green-sitting|worm-coiled|lizard-(walking|running|stretching))/;
// Drawn in fine or pale lines: each only reads from this scale up (not on a phone or a tablet; the pale
// olive sprig only on a big screen).
const FINE = { 'shrub-buds-mauve': .4, 'sprig-buds-olive': .55, 'worm-thin-brown': .4, 'stem-bent-green': .4, 'twig-forked-brown': .4 };
// Where a lizard's poop goes: behind her, under the tail (a point in her box; the ones that stand, on the ground).
const REAR = { 'lizard-walking-tongue-out': [.1, 1], 'lizard-running': [.08, 1], 'lizard-stretching': [.04, 1], 'lizard-leaping': [.02, .62] };

// Drawings too alike to be seen together (mirror images, the same thing in another colour), and kinds
// of which one at a time is enough on a small screen.
const FAMILIES = ['lizard', 'microbe-dancing-pair', 'microbe-spiral-green', 'mushrooms-orange', 'slug-hat', 'flower-head',
  'microbe-star', 'grass', 'butterfly', 'snail', 'worm', 'fly'];
const TWINS = new Set(['microbe-dancing-pair', 'microbe-spiral-green', 'mushrooms-orange', 'slug-hat']);
const family = name => (name.startsWith('poop-') && !name.includes('plant') ? 'poop' : /^(grass-curl|sprout-curl)/.test(name) ? 'curl'
  : FAMILIES.find(f => name.startsWith(f)) ?? name);

// Left out: the rings. In the book they are halos around something; on their own they read as a scribble.
const drawings = JSON.parse(wall.dataset.sprites).filter(([, , , , kind]) => kind !== 'ring').map(([name, w, h, , kind]) =>
  ({ name, w, h, kind, f: SIZE[name] ?? KIND[kind] ?? 1, family: family(name),
     stands: (kind === 'plant' && !LOOSE.test(name)) || kind === 'rock' ? 2 : SITS.test(name) ? 1 : 0 }));

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

// ---------------------------------------------------------------- the ink of each drawing

// Where its ink is, as a small mask, how much of its box the ink covers, and its colour on the whole:
// measured once from the picture and remembered on this device (until the site is next rebuilt, which
// stamps a new version on this script), so that later visits can lay the drawings out at once, before
// their pictures have arrived.
const INK = 64, STORE = `lizardi-v1-ink-${new URL(import.meta.url).searchParams.get('v') ?? ''}`;
const canvas = document.createElement('canvas');
const pen = canvas.getContext('2d', { willReadFrequently: true });
let stored = {}, unsaved = false;
try {
  stored = JSON.parse(localStorage.getItem(STORE)) || {};
  for (const key of Object.keys(localStorage)) if (key.startsWith('lizardi-v1-ink') && key !== STORE) localStorage.removeItem(key);
} catch { stored = {}; }

function analyse(d, img) {
  const k = INK / Math.max(d.w, d.h), mw = Math.max(1, Math.round(d.w * k)), mh = Math.max(1, Math.round(d.h * k));
  canvas.width = mw;
  canvas.height = mh;
  pen.drawImage(img, 0, 0, mw, mh);
  const p = pen.getImageData(0, 0, mw, mh).data, mask = new Uint8Array(mw * mh), sum = [0, 0, 0, 0];
  for (let i = 0; i < mask.length; i++) {
    const a = p[i * 4 + 3];
    mask[i] = a > 20 ? 1 : 0;
    for (let c = 0; c < 3; c++) sum[c] += p[i * 4 + c] * a;
    sum[3] += a;
  }
  Object.assign(d, { mw, mh, mask, fill: sum[3] / 255 / mask.length, rgb: sum.slice(0, 3).map(v => v / (sum[3] || 1)) });
  unsaved = true;
  feet(d);
}
// The bottom of its ink, and how far across its lowest ink reaches: where it stands.
function feet(d) {
  const { mw, mh, mask } = d;
  let low = mh - 1;
  while (low > 0 && !mask.subarray(low * mw, (low + 1) * mw).some(Boolean)) low--;
  let l = mw, r = 0;
  for (let y = Math.max(0, low - 1); y <= low; y++) for (let x = 0; x < mw; x++) if (mask[y * mw + x]) { l = Math.min(l, x); r = Math.max(r, x + 1); }
  Object.assign(d, { sole: (low + 1) / mh, toes: [l / mw, r / mw] });
}
function unpack(d) {
  const s = stored[d.name];
  if (!Array.isArray(s) || s[0] !== d.w || s[1] !== d.h) return;
  try {
    const [, , mw, mh, fill, r, gr, b, bits] = s, raw = atob(bits), mask = new Uint8Array(mw * mh);
    for (let i = 0; i < mask.length; i++) mask[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
    Object.assign(d, { mw, mh, mask, fill, rgb: [r, gr, b] });
    feet(d);
  } catch { delete d.mask; }
}
function remember() {
  if (!unsaved) return;
  unsaved = false;
  const all = {};
  for (const d of drawings) {
    if (!d.mask) continue;
    const bytes = new Uint8Array(Math.ceil(d.mask.length / 8));
    d.mask.forEach((v, i) => { if (v) bytes[i >> 3] |= 1 << (i & 7); });
    all[d.name] = [d.w, d.h, d.mw, d.mh, +d.fill.toFixed(3), ...d.rgb.map(Math.round), btoa(String.fromCharCode(...bytes))];
  }
  try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* private mode, or full: measure again next time */ }
}
for (const d of drawings) unpack(d);
// Fetch the first few pictures that are not measured yet, side by side, while the first is waited for.
const ahead = (list, n = 3) => list.filter(d => !d.mask).slice(0, n).forEach(load);
async function ink(d) {
  if (!d.mask) {
    const img = await load(d);
    if (img && !d.mask) analyse(d, img);
  }
  return d.mask ? d : null;
}

// ---------------------------------------------------------------- the grid the drawings are laid out on

// The window as a grid of small squares. `used` counts what covers each square: the works, the face and
// the margins, and every drawing with its breathing space around it. `soft` marks the strip just above
// a work, which only something standing on that work may use. `room` is how far each square is from the
// nearest covered one, so the emptiest places can be found.
let g; // { cell, cols, rows, gap, used, soft, room, most }

function grid(width, height, cell, gap) {
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell), n = cols * rows;
  g = { cell, cols, rows, gap, used: new Uint16Array(n), soft: new Uint8Array(n), room: new Float32Array(n), most: 0 };
}
const span = (a, b, n) => [Math.max(0, Math.floor(a / g.cell)), Math.min(n, Math.ceil(b / g.cell))];

// Cover everything outside the rectangle (in pixels) that drawings may use.
function keepInside(left, top, right, bottom) {
  const { cell, cols, rows, used } = g;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x * cell < left || (x + 1) * cell > right || y * cell < top || (y + 1) * cell > bottom) used[y * cols + x] = 1;
  }
}
function cover(left, top, right, bottom) {
  const { cols, rows, used } = g, [x0, x1] = span(left, right, cols), [y0, y1] = span(top, bottom, rows);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) used[y * cols + x] = 1;
}
// The strip just above a work, as far as nothing else covers it already.
function strip(left, top, right, bottom, id) {
  const { cols, rows, used, soft } = g, [x0, x1] = span(left, right, cols), [y0, y1] = span(top, bottom, rows);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!used[y * cols + x]) soft[y * cols + x] = id;
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

// A drawing as the grid sees it, at the size it will be shown: the squares its ink touches, those of
// them on its outline, and its ink grown by the breathing space (and by the narrower one kept between
// the drawings of one group).
const TIGHT = .45;
function shape(d, w, h) {
  const { cell, gap } = g, { mask, mw, mh } = d;
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), ink = new Uint8Array(cols * rows);
  const kx = mw / w * cell, ky = mh / h * cell;
  for (let y = 0; y < rows; y++) {
    const y0 = Math.min(mh - 1, Math.floor(y * ky)), y1 = Math.min(mh, Math.max(y0 + 1, Math.ceil((y + 1) * ky)));
    for (let x = 0; x < cols; x++) {
      const x0 = Math.min(mw - 1, Math.floor(x * kx)), x1 = Math.min(mw, Math.max(x0 + 1, Math.ceil((x + 1) * kx)));
      let any = 0;
      for (let my = y0; my < y1 && !any; my++) for (let mx = x0; mx < x1; mx++) if (mask[my * mw + mx]) { any = 1; break; }
      ink[y * cols + x] = any;
    }
  }
  const cells = [], edge = [];
  let bottom = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!ink[y * cols + x]) continue;
    cells.push(x, y);
    bottom = y;
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 || !ink[y * cols + x - 1] || !ink[y * cols + x + 1] ||
        !ink[(y - 1) * cols + x] || !ink[(y + 1) * cols + x]) edge.push(x, y);
  }
  const grow = space => {
    const r = Math.max(1, Math.round(space / cell)), hw = cols + 2 * r, hh = rows + 2 * r, halo = new Uint8Array(hw * hh), disc = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) disc.push(dx, dy);
    for (let i = 0; i < edge.length; i += 2) {
      const ex = edge[i] + r, ey = edge[i + 1] + r;
      for (let j = 0; j < disc.length; j += 2) halo[(ey + disc[j + 1]) * hw + ex + disc[j]] = 1;
    }
    for (let i = 0; i < cells.length; i += 2) halo[(cells[i + 1] + r) * hw + cells[i] + r] = 1;
    const out = [];
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) if (halo[y * hw + x]) out.push(x - r, y - r);
    return out;
  };
  return { cols, rows, ink, cells, edge, bottom, grown: grow(gap), tight: grow(gap * TIGHT) };
}

// Whether its ink lands on free squares only (or, standing on a work, on that work's strip).
function fits(s, px, py, on = 0) {
  const { cols, rows, used, soft } = g;
  if (px < 0 || py < 0 || px + s.cols > cols || py + s.rows > rows) return false;
  const c = s.cells;
  for (let i = 0; i < c.length; i += 2) {
    const j = (py + c[i + 1]) * cols + px + c[i], u = used[j];
    if (u && !(on && u === 1 && soft[j] === on)) return false;
  }
  return true;
}
// How much room is left around it: the narrowest gap between its outline and anything else.
function clearance(s, px, py) {
  const { cols, room } = g, e = s.edge;
  let least = Infinity;
  for (let i = 0; i < e.length; i += 2) least = Math.min(least, room[(py + e[i + 1]) * cols + px + e[i]]);
  return least;
}
function mark(s, px, py, by, halo = s.grown) {
  const { cols, rows, used } = g;
  for (let i = 0; i < halo.length; i += 2) {
    const x = px + halo[i], y = py + halo[i + 1];
    if (x >= 0 && y >= 0 && x < cols && y < rows) used[y * cols + x] += by;
  }
}
// The drawings of one group keep only the narrow space between them: while one more is fitted in, the
// others hold their wide space back.
function huddle(mates, by) {
  for (const m of mates) {
    mark(m.s, m.px, m.py, -by, m.s.grown);
    mark(m.s, m.px, m.py, by, m.s.tight);
  }
}

// ---------------------------------------------------------------- laying the drawings out

let items = [], scale = 1, started = 0, gen = 0, target = 0, grounds = [], quiet = [], smallest = 30;

function sizeOf(d) { return [d.w * d.f * scale, d.h * d.f * scale]; }
// Big enough to be seen for what it is: no specks, and fine lines only where they come out thick enough.
function legible(d) {
  const [w, h] = sizeOf(d);
  if (Math.max(w, h) < smallest || Math.min(w, h) < smallest * .5) return false;
  if (scale < (FINE[d.name] ?? 0)) return false;
  return d.fill === undefined || Math.sqrt(w * h * d.fill) >= 24;
}

// Next to a drawing of much the same colour, or of the same family, a place counts as less roomy.
function crowding(d, w, h, cx, cy) {
  let penalty = 0;
  const size = Math.max(w, h);
  for (const item of items) {
    const reach = (size + Math.max(item.w, item.h)) / 2 + g.gap * 2.5, far = Math.hypot(item.cx - cx, item.cy - cy);
    if (far >= reach) continue;
    const likeness = Math.max(item.d.family === d.family ? 1 : 0, 1 - Math.hypot(...item.d.rgb.map((v, i) => v - d.rgb[i])) / 80);
    if (likeness > 0) penalty += 3 * likeness * (1 - far / reach);
  }
  return penalty;
}
// The quiet parts of the garden: around a few points, chosen afresh on every visit, the drawings that
// float keep wider apart, so the air thins out there instead of being evenly full. On a phone the
// pockets are small and none is quiet.
// On a wide screen, the bands above and below the works are for what stands there: what floats keeps to
// the fields at the sides, so the bands do not fill up into rows.
let bands = [];
function stillness(x, y) {
  let most = 0;
  for (const q of quiet) most = Math.max(most, Math.exp(-((x - q.x) ** 2 + (y - q.y) ** 2) / (q.r * q.r)));
  for (const b of bands) if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) most = 1;
  return most;
}

// What floats: everything that does not have to stand, but for the lizards and their poop, which come together.
const floats = d => d.stands < 2 && d.kind !== 'lizard' && d.kind !== 'poop';
// No more of a family than one in eighteen (one of twins), and of what floats, no kind much above its share,
// so that every view has a bit of everything: microbes, creatures that crawl and fly, a leaf or a flower.
const share = {}, floating = drawings.filter(floats);
for (const d of floating) share[d.kind] = (share[d.kind] ?? 0) + 1 / floating.length;
const shown = d => items.some(item => item.d === d);
const allowed = d => {
  if (shown(d)) return false;
  const family = items.filter(item => item.d.family === d.family).length;
  if (family >= (TWINS.has(d.family) ? 1 : 1 + Math.floor(items.length / 18))) return false;
  if (!floats(d)) return true;
  const afloat = items.filter(item => !item.ground && floats(item.d)), kind = afloat.filter(item => item.d.kind === d.kind).length;
  return kind < 1.5 + afloat.length * share[d.kind] * 1.4;
};

// Where it can go. Every place tried must take its ink on free squares only.
//   ground: it stands on this ground, its feet on the line.
//   mates: it belongs with these and keeps only the narrow space from them.
//   aim: it goes as near this point (where its middle, or for one that stands, its feet, should be) as it fits.
//   near: it goes somewhere around this point (in squares), where it has the most room.
// Otherwise it goes where it has the most room of all, and in a quiet part only if the room there is wide.
//   all: (standing, with no aim) every place it fits, the roomier the likelier to come first.
function find(d, { ground = null, mates = [], aim = null, near = null, all = false } = {}) {
  const [w, h] = sizeOf(d), s = shape(d, w, h), { cell, cols, rows, room } = g;
  const tried = [];
  if (ground) {
    // Its lowest row of ink on the last row of squares above the line; it may stand anywhere along the line
    // where all of its feet are on it.
    const py = Math.floor(ground.y / cell) - 1 - s.bottom;
    const lo = Math.ceil((ground.x0 - w * d.toes[0]) / cell), hi = Math.floor((ground.x1 - w * d.toes[1]) / cell);
    for (let px = lo; px <= hi; px++) tried.push(px, py);
  } else if (aim) {
    const ax = Math.round(aim.x / cell - s.cols / 2), ay = Math.round(aim.y / cell - s.rows / 2), r = Math.ceil(g.gap * 2.5 / cell + s.cols / 3);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) tried.push(ax + dx, ay + dy);
  } else if (near) {
    for (let k = 0; k < 90; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * near.r;
      tried.push(Math.round(near.x + Math.cos(a) * r - s.cols / 2), Math.round(near.y + Math.sin(a) * r - s.rows / 2));
    }
  } else {
    const open = [];
    for (let i = 0; i < room.length; i++) if (room[i] >= 2) open.push(i);
    if (!open.length) return null;
    for (let k = 0; k < 260; k++) {
      const i = open[(Math.random() * open.length) | 0];
      tried.push((i % cols) - (s.cols >> 1), ((i / cols) | 0) - (s.rows >> 1));
    }
  }
  if (mates.length) huddle(mates, 1);
  const on = ground?.on ?? 0;
  const score = (px, py) => {
    if (!fits(s, px, py, on)) return -Infinity;
    const cx = (px + s.cols / 2) * cell, cy = (py + s.rows / 2) * cell;
    if (aim) return -Math.hypot(cx - aim.x, (ground ? aim.y : cy) - aim.y) / cell;
    const free = clearance(s, px, py), calmness = ground ? 0 : stillness(cx, cy);
    if (calmness > .8 || (calmness && free < calmness * 2.6 * g.gap / cell)) return -Infinity; // the heart of a quiet part stays bare
    return free - crowding(d, w, h, cx, cy) - calmness * 2;
  };
  let best = null, bestScore = -Infinity;
  const spot = ([px, py]) => ({ d, s, w, h, px, py, x: px * cell, y: ground ? ground.y - h * d.sole : py * cell, ground });
  if (ground && !aim) {
    // Standing, somewhere along the ground where it has room, not always in the middle of the widest gap:
    // the clumps should not fall at even intervals. (Drawn by lot, each place weighted by its room, up to
    // one and a half breathing spaces: beyond that, any place is as good as another.)
    const fair = [], enough = 1.5 * g.gap / cell;
    for (let k = 0; k < tried.length; k += 2) {
      const v = score(tried[k], tried[k + 1]);
      if (v > -Infinity) fair.push([tried[k], tried[k + 1], Math.random() ** (1 / (Math.min(Math.max(0, v), enough) ** 2 + .1))]);
    }
    fair.sort((a, b) => b[2] - a[2]);
    if (mates.length) huddle(mates, -1);
    if (all) return fair.map(spot);
    return fair.length ? spot(fair[0]) : null;
  } else {
    for (let k = 0; k < tried.length; k += 2) {
      const v = score(tried[k], tried[k + 1]);
      if (v > bestScore) { best = [tried[k], tried[k + 1]]; bestScore = v; }
    }
  }
  // Then nudge it to the middle of its gap.
  if (best && !aim) {
    for (const step of [3, 2, 1, 1]) {
      let moved = true;
      while (moved) {
        moved = false;
        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const v = score(best[0] + dx, best[1] + dy);
          if (v > bestScore + .01) { best = [best[0] + dx, best[1] + dy]; bestScore = v; moved = true; }
        }
      }
    }
  }
  if (mates.length) huddle(mates, -1);
  return best && spot(best);
}

// A creature that sits, come to rest just above a ground, sits down on it rather than hover there.
function settle(d, spot) {
  if (!spot || d.stands !== 1) return spot;
  const left = spot.x + spot.w * d.toes[0], right = spot.x + spot.w * d.toes[1], foot = spot.y + spot.h * d.sole;
  for (const ground of grounds) {
    if (foot > ground.y || ground.y - foot > g.gap || left < ground.x0 || right > ground.x1) continue;
    const down = find(d, { ground, aim: { x: spot.x + spot.w / 2, y: ground.y } });
    if (down && Math.abs(down.x - spot.x) < g.gap) return down;
  }
  return spot;
}

function put(spot, delay = 0, from = null) {
  if (calm.matches) delay = 0;
  const { d, s, px, py, w, h, x, y, ground } = spot;
  mark(s, px, py, 1);
  measure();
  const img = new Image();
  img.src = `${folder}${d.name}.webp`;
  img.alt = '';
  img.className = ground ? 'sprite rooted' : 'sprite';
  img.draggable = false;
  img.style.width = `${w.toFixed(1)}px`;
  wall.append(img);
  const item = { d, img, s, px, py, x, y, w, h, cx: x + w / 2, cy: y + h / 2, ground, group: null, born: performance.now(),
    ox: from?.ox ?? 0, oy: from?.oy ?? 0, vx: from?.vx ?? 0, vy: from?.vy ?? 0 };
  draw(item);
  items.push(item);
  if (item.ox || item.oy) moving.add(item);
  const due = performance.now() + delay;
  img.decode().catch(() => {}).then(() => {
    img.style.setProperty('--delay', `${Math.max(0, due - performance.now()).toFixed(0)}ms`);
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('in')));
    setTimeout(() => img.style.removeProperty('--delay'), Math.max(0, due - performance.now()) + 700);
  });
  return item;
}
function draw(item) {
  item.img.style.translate = `${(item.x + item.ox).toFixed(1)}px ${(item.y + item.oy).toFixed(1)}px`;
}

function lift(item) {
  mark(item.s, item.px, item.py, -1);
  measure();
  items.splice(items.indexOf(item), 1);
  item.img.classList.add('out');
  setTimeout(() => { item.img.remove(); moving.delete(item); }, 420);
}

// The lizard, and her poop just behind her. She is placed with it in mind: of the places she fits, the
// first with room behind her for a poop.
async function lizard(mine, where = null, avoid = []) {
  ahead(drawings.filter(d => d.kind === 'lizard' || d.kind === 'poop'), 11);
  const poops = shuffle(drawings.filter(p => p.kind === 'poop' && !shown(p) && !avoid.includes(p)));
  for (const d of shuffle(drawings.filter(d => d.kind === 'lizard' && !avoid.includes(d) && !shown(d)))) {
    if (!(await ink(d)) || mine !== gen) { if (mine !== gen) return null; continue; }
    if (!legible(d)) continue;
    for (const p of poops) await ink(p);
    if (mine !== gen) return null;
    // One that walks stands on a ground if there is one she fits on; otherwise, and for the others, she goes
    // where there is room. (Stirred, she gives way to another lizard as near as can be to where she was.)
    // Standing matters more than the poop: she floats only if she can stand nowhere.
    let standing = [];
    if (d.stands) {
      standing = grounds.flatMap(ground => find(d, { ground, all: true }).slice(0, where ? Infinity : 8));
      const far = spot => Math.hypot(spot.x + spot.w / 2 - where.x, spot.y + spot.h / 2 - where.y);
      standing = where ? standing.sort((a, b) => far(a) - far(b)).slice(0, 12) : shuffle(standing).slice(0, 24);
    }
    let best = null;
    for (const spot of standing.length ? standing : [find(d, where ? { near: where.near } : {})].filter(Boolean)) {
      const poop = behind(spot, poops);
      if (poop) { best = [spot, poop]; break; }
      best ??= [spot, null];
    }
    if (!best) continue;
    const she = put(best[0], where ? 90 : 0), group = { kind: 'lizard', members: [she] };
    she.group = group;
    if (best[1]) {
      const poop = put(best[1], where ? 170 : 90);
      poop.group = group;
      group.members.push(poop);
    }
    return group;
  }
  return null;
}
// Where a poop fits behind her, if anywhere: under the tail, on her ground if she stands on one.
function behind(she, poops) {
  const rear = REAR[she.d.name];
  if (!rear) return null;
  const aim = { x: she.x + she.w * rear[0], y: she.y + she.h * rear[1] };
  let found = null;
  mark(she.s, she.px, she.py, 1);
  for (const p of poops) {
    if (!p.mask || !legible(p)) continue;
    const spot = find(p, she.ground ? { ground: she.ground, mates: [she], aim } : { mates: [she], aim });
    if (spot && Math.hypot(spot.x + spot.w / 2 - aim.x, (she.ground ? aim.y : spot.y + spot.h / 2) - aim.y) <= g.gap * 2 + spot.w / 2) { found = spot; break; }
  }
  mark(she.s, she.px, she.py, -1);
  return found;
}

// A clump: a plant or a stone standing on a ground, and perhaps one or two more beside it, close together.
async function clump(mine, ground, size) {
  const members = [];
  // A plant or a stone to begin with; on a short ground, where none fits, a creature that sits.
  const options = [...shuffle(drawings.filter(d => d.stands === 2 && allowed(d) && legible(d))).slice(0, 8),
    ...shuffle(drawings.filter(d => d.stands === 1 && d.kind !== 'lizard' && allowed(d) && legible(d))).slice(0, 3)];
  ahead(options);
  for (const d of options) {
    if (!(await ink(d)) || mine !== gen) return members;
    if (!legible(d)) continue;
    const spot = find(d, { ground });
    if (!spot) continue;
    members.push(put(spot));
    break;
  }
  if (!members.length) return members;
  for (let k = 1; k < size; k++) {
    const left = Math.min(...members.map(m => m.x)), right = Math.max(...members.map(m => m.x + m.w));
    let placed = false;
    const options = shuffle(drawings.filter(d => d.stands && d.kind !== 'lizard' && allowed(d) && legible(d))).slice(0, 8);
    ahead(options);
    for (const d of options) {
      if (!(await ink(d)) || mine !== gen) return members;
      if (!legible(d)) continue;
      const [w] = sizeOf(d);
      for (const side of shuffle([-1, 1])) {
        const aim = { x: side < 0 ? left - g.gap * TIGHT - w / 2 : right + g.gap * TIGHT + w / 2, y: ground.y };
        const spot = find(d, { ground, mates: members, aim });
        if (!spot || Math.abs(spot.x + w / 2 - aim.x) > g.gap * 1.5) continue;
        members.push(put(spot, 60 + k * 50));
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed) break;
  }
  const group = { kind: 'clump', members };
  for (const m of members) m.group = group;
  return members;
}

async function scatter() {
  const mine = ++gen;
  items = [];
  moving.clear();
  wall.replaceChildren();
  const width = wall.clientWidth, height = wall.clientHeight;
  const pad = getComputedStyle(shelf);
  const [top, right, , left] = ['Top', 'Right', 'Bottom', 'Left'].map(side => parseFloat(pad[`padding${side}`]) || 0);
  const box = el => ({ left: el.offsetLeft, top: el.offsetTop, right: el.offsetLeft + el.offsetWidth, bottom: el.offsetTop + el.offsetHeight });
  const works = [box(document.querySelector('.work.book')), box(document.querySelector('.work.diary'))];
  const face = box(document.querySelector('.faces'));
  // One scale for every drawing, in proportion to the book; a little larger on a phone, where the drawings
  // have only the two pockets beside the works and must hold their own next to them.
  const tall = height > width * 1.3;
  scale = Math.min(.8, Math.max(.2, (works[0].bottom - works[0].top) / (tall ? 1150 : 1250)));
  // The same breathing space between any two drawings; a little more around the works. The margin at the
  // edges of the window is the face's: it stands in the corner, on the bottom of the garden.
  const gap = Math.max(14, (tall ? 66 : 72) * scale), cell = Math.max(3, Math.round(gap / 5));
  const edge = Math.max(10, face.left - left), floor = face.bottom;
  grid(width, height, cell, gap);
  const moat = gap * 1.2, shadow = (works[0].right - works[0].left) * .03;
  smallest = Math.max(30, gap * 1.7);
  keepInside(left + edge, top + edge, width - right - edge, floor);
  cover(face.left - gap, face.top - gap, face.right + gap, face.bottom + gap);
  // The grounds: the bottom of the garden, and the top of each work that has room above it.
  grounds = [{ x0: left + edge, x1: width - right - edge, y: floor, on: 0 }];
  const around = w => [w.left - moat, w.top - moat, w.right + moat + shadow, w.bottom + moat + shadow];
  works.forEach((w, i) => {
    if (w.top - top - edge < smallest * 1.4) return;
    // The other work's space is no part of this one's strip.
    const other = works[1 - i], saved = g.used.slice();
    cover(...around(other));
    strip(w.left - moat, w.top - moat, w.right + moat + shadow, w.top, i + 1);
    g.used = saved;
    grounds.push({ x0: w.left + gap * .3, x1: w.right - gap * .3, y: w.top, on: i + 1 });
  });
  for (const w of works) cover(...around(w));
  measure();
  quiet = [];
  // The calm bands, when the works leave wide fields at their sides for what floats.
  const inner = [Math.min(...works.map(w => w.left)), Math.max(...works.map(w => w.right))];
  bands = !tall && inner[0] - left > width * .15
    ? [[inner[0] - moat, 0, inner[1] + moat, Math.min(...works.map(w => w.top))], [inner[0] - moat, Math.max(...works.map(w => w.bottom)), inner[1] + moat, height]] : [];
  started = performance.now();

  // First the lizard (the book is about her), with her poop.
  await lizard(mine);
  if (mine !== gen) return;
  // Then the clumps, a few, with stretches of bare ground between them: on a phone one on each ground.
  const length = grounds.reduce((sum, ground) => sum + ground.x1 - ground.x0, 0);
  const many = Math.max(2, Math.min(4, Math.round(length / (gap * 24))));
  const order = shuffle(grounds.flatMap(ground => Array(Math.max(1, Math.round(many * (ground.x1 - ground.x0) / length))).fill(ground)));
  for (const ground of order.slice(0, many)) {
    await clump(mine, ground, 1 + (Math.random() < .55) + (scale > .36 && Math.random() < .35));
    if (mine !== gen) return;
  }

  // The quiet parts: on a big screen, one or two of the wide stretches of garden left, where what floats
  // keeps further apart.
  if (!tall && scale > .3) {
    const n = 1 + (width * height > 2.5e6 || (width > height && Math.random() < .5)); // two on a very big screen
    for (let k = 0; k < 60 && quiet.length < n; k++) {
      const i = (Math.random() * g.room.length) | 0, x = (i % g.cols) * cell, y = ((i / g.cols) | 0) * cell;
      if (g.room[i] * cell < gap * 2 || quiet.some(q => Math.hypot(q.x - x, q.y - y) < Math.min(width, height) * .45)) continue;
      quiet.push({ x, y, r: Math.min(width, height) * (.12 + Math.random() * .05) });
    }
  }

  // Then what floats, the largest more or less first, so that the small ones fill in around them; a third
  // sit this visit out, so the big ones are not always the same. On a phone, where the pockets are narrow,
  // the bold middle sizes: none wider than most of a pocket, and the solid ones before the spindly.
  const rest = drawings.filter(d => floats(d) && !shown(d));
  const out = new Set(rest.filter(() => Math.random() < (tall ? .15 : .3)));
  const pocket = (width - right - edge - works[0].right - moat) * .85;
  const deck = rest.filter(d => !out.has(d) && (!tall || Math.max(...sizeOf(d)) <= pocket))
    .map(d => ({ d, k: tall ? (d.w * d.f * d.h * d.f * (d.fill ?? .4)) ** .35 * (.4 + Math.random() * 1.2)
      : d.w * d.f * d.h * d.f * (d.fill ?? .4) ** .3 * (.25 + Math.random() * 1.5) }))
    .sort((a, b) => b.k - a.k).map(x => x.d);
  let misses = 0, n = items.length, slice = performance.now();
  const later = [];
  ahead(deck, 8);
  for (let i = 0; i < deck.length + later.length; i++) {
    const d = i < deck.length ? deck[i] : later[i - deck.length];
    if (deck[i + 8] && !deck[i + 8].mask) load(deck[i + 8]);
    if (misses > 40) break;
    const [w, h] = sizeOf(d);
    if (!legible(d)) continue;
    if (!allowed(d)) { if (i < deck.length && !shown(d)) later.push(d); continue; } // perhaps once there are more of the others
    // Skip, without loading it, a drawing too big for the largest gap left.
    if (Math.min(w, h) / g.cell / 2 > g.most * 1.25 || w / g.cell > g.cols || h / g.cell > g.rows) { misses++; continue; }
    if (!(await ink(d)) || mine !== gen) { if (mine !== gen) return; continue; }
    if (!legible(d)) continue;
    const spot = settle(d, find(d));
    if (!spot) { misses++; continue; }
    misses = 0;
    put(spot, Math.max(0, started + 160 + n++ * 45 - performance.now()));
    if (performance.now() - slice > 12) { // let a frame through now and then
      await new Promise(requestAnimationFrame);
      if (mine !== gen) return;
      slice = performance.now();
    }
  }
  target = items.length; // stirring keeps about this many
  remember();
}

// ---------------------------------------------------------------- stirring

// One drawing gives way to another of the same kind and about its size, in the same space (a lizard
// always to a lizard, with her poop; a plant to a plant on the same ground), so the mix stays as it was.
// If the newcomer is smaller and leaves a hole big enough for one more, one more comes.
let chain = Promise.resolve(), recent = [];
function renew(item) {
  item.due = true;
  chain = chain.then(async () => {
    if (!items.includes(item)) return;
    const mine = gen;
    if (item.group?.kind === 'lizard') return lizardAgain(item.group, mine);
    lift(item);
    recent = [item.d, ...recent].slice(0, 8);
    const area = item.w * item.h, kind = item.d.kind, { ground } = item;
    const mates = item.group ? item.group.members.filter(m => m !== item && items.includes(m)) : [];
    const options = drawings.filter(d => !recent.includes(d) && legible(d) && allowed(d) &&
        (ground ? d.stands && d.kind !== 'lizard' && (item.d.stands < 2 || d.stands === 2) : floats(d)))
      .map(d => {
        const [w, h] = sizeOf(d), ratio = Math.log(w * h / area);
        return { d, k: (d.kind === kind ? 0 : .6) + (ratio > 0 ? ratio * 1.4 : -ratio) + Math.random() * .3 };
      }).sort((a, b) => a.k - b.k).slice(0, 12);
    const near = { x: item.px + item.s.cols / 2, y: item.py + item.s.rows / 2, r: Math.max(item.s.cols, item.s.rows) * .45 + 2 };
    for (const { d } of options) {
      if (!(await ink(d)) || mine !== gen) return;
      if (!legible(d)) continue;
      const spot = ground ? find(d, { ground, mates, aim: { x: item.cx, y: ground.y } }) : settle(d, find(d, { near }));
      if (!spot || (ground && Math.abs(spot.x + spot.w / 2 - item.cx) > Math.max(item.w, spot.w) * .6 + g.gap)) continue;
      const fresh = put(spot, 120, item);
      if (item.group) {
        item.group.members[item.group.members.indexOf(item)] = fresh;
        fresh.group = item.group;
      }
      return fill(mine);
    }
    // Nothing else fits there: the same one comes back.
    const back = put({ ...item, d: item.d }, 120, item);
    if (item.group) {
      item.group.members[item.group.members.indexOf(item)] = back;
      back.group = item.group;
    }
  }).catch(() => {});
}

async function lizardAgain(group, mine) {
  const old = group.members.filter(m => items.includes(m)), she = old[0];
  for (const m of old) lift(m);
  recent = [...old.map(m => m.d), ...recent].slice(0, 8);
  const where = { x: she.cx, y: she.cy, near: { x: she.px + she.s.cols / 2, y: she.py + she.s.rows / 2, r: Math.max(she.s.cols, she.s.rows) * .5 + 2 } };
  let again = await lizard(mine, where, old.map(m => m.d));
  if (mine !== gen) return;
  // A lizard that finds no room near where the last one was may go wherever there is room; if there is
  // none, the same one comes back, with the same poop.
  if (!again) again = await lizard(mine, null, old.map(m => m.d));
  if (mine !== gen || again) return;
  const back = old.map(m => put({ ...m }, 120, m));
  const group2 = { kind: 'lizard', members: back };
  for (const m of back) m.group = group2;
}

async function fill(mine) {
  const room = g.most * g.cell * 2; // across the largest hole
  if (items.length >= target || room < smallest * 1.1) return;
  const options = drawings.filter(d => floats(d) && !recent.includes(d) && legible(d) && allowed(d))
    .map(d => ({ d, size: sizeOf(d) })).filter(({ size }) => Math.min(...size) <= room * 1.2)
    .sort((a, b) => b.size[0] * b.size[1] * (.6 + Math.random() * .8) - a.size[0] * a.size[1] * (.6 + Math.random() * .8)).slice(0, 6);
  for (const { d } of options) {
    if (!(await ink(d)) || mine !== gen) return;
    const spot = settle(d, find(d));
    if (!spot) continue;
    put(spot, 140);
    return;
  }
}

// ---------------------------------------------------------------- following the finger

// The drawings near the finger are carried a little way with it, and spring back once it has gone by:
// never further than most of a breathing space, so they never touch each other or reach a work. One that
// stands slides along its ground.
const moving = new Set();
let frame = 0;
function carry(x, y, dx, dy) {
  if (calm.matches || !g) return;
  const reach = Math.max(130, 340 * scale);
  for (const item of items) {
    const far = Math.hypot(item.cx - x, item.cy - y);
    if (far > reach * 1.8) continue;
    const k = Math.exp(-(far * far) / (reach * reach)) * .34;
    item.vx += dx * k;
    if (!item.ground) item.vy += dy * k;
    moving.add(item);
  }
  frame ||= requestAnimationFrame(spring);
}
function spring() {
  frame = 0;
  const most = g.gap * .9;
  for (const item of moving) {
    item.vx = (item.vx - item.ox * .07) * .8;
    item.vy = (item.vy - item.oy * .07) * .8;
    item.ox += item.vx;
    item.oy += item.vy;
    const far = Math.hypot(item.ox, item.oy);
    if (far > most) { item.ox *= most / far; item.oy *= most / far; }
    if (far < .05 && Math.abs(item.vx) + Math.abs(item.vy) < .05) {
      item.ox = item.oy = item.vx = item.vy = 0;
      moving.delete(item);
    }
    draw(item);
  }
  if (moving.size) frame = requestAnimationFrame(spring);
}

if ('stir' in wall.dataset) {
  let last = null, speed = 0, gliding = 0, wave = null, along = 0;
  // One face looks out of the corner. Stir far enough and the other takes its place; the first one
  // (Lucas) is there to begin with and stays about three times as long.
  const faces = [...document.querySelectorAll('.faces a')];
  const stay = () => (faces[0].classList.contains('on') ? 1300 : 450) * (0.7 + Math.random() * 0.6);
  let stirred = 0, enough = faces.length > 1 ? stay() : Infinity;
  // The wave runs from `from` to `to` (heights on the screen) and renews what it passes, the drawings
  // nearest the finger first and the rest one after another outwards from it, like a ripple.
  const sweep = (from, to) => {
    const now = performance.now(), lo = Math.min(from, to), hi = Math.max(from, to);
    for (const item of [...items]) {
      if (item.cy < lo || item.cy >= hi || now - item.born < 600 || item.due) continue;
      item.due = true;
      const wait = calm.matches ? 0 : 40 + Math.abs(item.cx - along) * .7;
      setTimeout(() => renew(item), wait);
    }
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
  // A tap is not a stir: the wave starts once the finger has really moved. A swipe that starts on the book
  // or the diary stirs too, rather than pick the link up to drag it somewhere.
  addEventListener('dragstart', e => e.preventDefault());
  let from = null, at = null;
  addEventListener('pointerdown', e => {
    cancelAnimationFrame(gliding);
    last = null;
    from = e.clientY;
    at = [e.clientX, e.clientY];
    speed = 0;
  });
  addEventListener('pointermove', e => {
    if (from === null) return;
    if (last === null) {
      if (Math.abs(e.clientY - from) < 10 && Math.abs(e.clientX - at[0]) < 10) return;
      last = wave = e.clientY;
    }
    carry(e.clientX, e.clientY, e.clientX - at[0], e.clientY - at[1]);
    at = [e.clientX, e.clientY];
    along = e.clientX;
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
  // The wheel has no finger to follow: its wave comes in from the far edge, and what is under the pointer
  // is carried along.
  let wheeled = 0;
  addEventListener('wheel', e => {
    if (performance.now() - wheeled > 600) wave = e.deltaY > 0 ? wall.clientHeight - 1 : 0;
    wheeled = performance.now();
    along = e.clientX;
    carry(e.clientX, e.clientY, 0, -Math.max(-30, Math.min(30, e.deltaY * .4)));
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
  if (!g) return null;
  const { cell, gap } = g, reach = Math.max(1, Math.round(gap / 2 / cell));
  let found = null, best = Infinity;
  for (const item of items) {
    const { s } = item, gx = Math.floor((x - item.x - item.ox) / cell), gy = Math.floor((y - item.y - item.oy) / cell);
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
  moving.clear();
  for (const img of wall.children) img.classList.add('out');
  clearTimeout(timer);
  timer = setTimeout(scatter, 200);
});
scatter();
