// The shelf, direction 1: friezes.
// The drawings walk in rows above and below the book and the diary, like the borders of a printed page.
// Each row stands on its own baseline and has a character of its own: the microbes, the small creatures,
// the lizards with their poop, the garden. In a row every drawing is upright, at one scale, the gaps
// between them even. A swipe or the wheel sends each row sideways at its own pace, the creatures walking
// the way they face, and each row comes to rest showing whole drawings from margin to margin.
// The order is shuffled on every visit.
const wall = document.querySelector('.wall');
const shelf = document.querySelector('.shelf');
const works = [...document.querySelectorAll('.work')];
const nav = document.querySelector('.faces');
const faces = [...nav.querySelectorAll('a')];
const folder = wall.dataset.src;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(pair => pair[1]);
const drawings = JSON.parse(wall.dataset.sprites).map(([name, w, h, , kind]) => ({ name, w, h, kind }));

// How tall each drawing stands, as a share of its row: what it is, not how big it happens to be drawn.
// The lizards are the biggest of the creatures, a beetle is small, poop is smaller still.
const SIZE = {
  // under the microscope: all of a size; the rings, drawn faint, a little smaller
  'microbe-branched-blue': .8, 'microbe-branched-magenta': 1, 'microbe-budding-yellow': .6, 'microbe-chain-blue': 1,
  'microbe-cilia-brown-blue': .5, 'microbe-dancing-pair-leaning': .92, 'microbe-dancing-pair-upright': .92,
  'microbe-pill-pink-tufted': .56, 'microbe-rod-knobbed-pink': .7, 'microbe-rod-teal-pili': .9, 'microbe-rods-mustard': 1,
  'microbe-spiral-green': .96, 'microbe-spiral-green-2': .96, 'microbe-spiral-yellow': 1, 'microbe-star-magenta': .74,
  'microbe-star-ochre-green': .78, 'microbe-star-orange-magenta': .84, 'microbe-star-yellow-pink': .84,
  'ring-lime': .78, 'ring-peach': .8, 'ring-small-mauve': .66, 'ring-teal': .8,
  // the small creatures
  'slug-big-yellow-green': 1, 'slug-hat-orange': .86, 'slug-hat-green': .72, 'slug-hat-lavender': .72, 'slug-pale-big-eye': .68,
  'slug-sleeping-mustard-pink-hat': .4, 'snail-pink-shell': .5, 'snail-yellow-brown-shell': .6, 'snail-upright-magenta': .9,
  'butterfly-magenta': .62, 'butterfly-orange': .72, 'fly-purple-front': .82, 'fly-blue-top-view': .6, 'beetle-orange-small': .36,
  'spider-teal': .8, 'worm-coiled-brown': .48, 'worm-thin-brown': .34, 'bug-green-sitting': .64, 'bug-pink-round': .52,
  // the lizards, the other animals and the poop
  'lizard-leaping': 1, 'lizard-stretching': 1, 'lizard-running': .74, 'lizard-walking-tongue-out': .84, 'lizard-upside-down': .96,
  'frog-green': .6, 'mouse-sitting-orange': .7, 'cat-grey-purple': .66, 'squirrel-orange-leaping': .64,
  'bird-purple-flying': .6, 'bird-purple-perched': .6,
  'poop-large-brown': .42, 'poop-on-green-plant': .62, 'poop-log-olive': .26, 'poop-small-ragged': .28, 'poop-tiny': .26, 'poop-tiny-tall': .32,
  // the garden: tall things standing up out of low things
  'sprig-buds-olive': .94, 'shrub-buds-mauve': .92, 'branch-blossoms-pink': .84, 'branch-stump-brown': .8, 'stem-forked-green-buds': .84,
  'flower-pink-on-stem': .9, 'flowers-pink-three-stems': .72, 'flowers-purple-pair': .74, 'grass-arch-green': .7,
  'mushrooms-trumpet-terracotta': .62, 'sprout-curl-tall-green': .64, 'fern-curls-lime': .66,
  'leaf-oak-mustard': .5, 'weed-spiky-olive': .54, 'grass-curl-green': .48, 'grass-fork-green': .5, 'bulb-magenta': .46,
  'sprout-curl-olive-purple': .42, 'mushrooms-orange': .42, 'mushrooms-orange-purple-outline': .42, 'mushrooms-pink-cap': .4,
  'grass-bent-bright-green': .38, 'grass-bent-dark-olive': .36, 'seed-pod-brown': .32, 'leaf-oak-green': .3, 'seedling-green': .34,
  'stem-bent-green': .26, 'twig-with-leaves-grey': .36, 'twig-forked-brown': .38, 'flower-head-blue': .36, 'flower-head-orange': .32,
  'flower-head-pink': .36, 'rocks-stacked-purple': .48, 'stone-wall-purple': .4,
};
const TALL = .6; // in the garden, these stand up out of the low things
// Which way the creatures look as drawn; in a row they are turned to look the way the row walks.
const RIGHT = new Set(['bird-purple-flying', 'bird-purple-perched', 'beetle-orange-small', 'slug-big-yellow-green', 'slug-hat-green',
  'slug-hat-lavender', 'slug-hat-orange', 'lizard-leaping', 'lizard-running', 'lizard-stretching', 'lizard-walking-tongue-out']);
const LEFT = new Set(['cat-grey-purple', 'squirrel-orange-leaping', 'slug-pale-big-eye', 'slug-sleeping-mustard-pink-hat',
  'snail-pink-shell', 'snail-upright-magenta', 'snail-yellow-brown-shell']);
const UPSIDE_DOWN = new Set(['lizard-upside-down']); // stands on its tail in a row, arms up

// The rows, from the top: within (the microbes and the rings), small (the small creatures), then the works,
// big (the lizards, the other animals and the poop) and the garden (the plants and the rocks), which grows
// from the bottom edge. Where four rows will not fit: creatures (all the creatures in one row) and the garden.
// size: the row's height against the others; gap: between drawings, against the row's height (in the garden
// the low plants stand a little in front of the tall ones); pace: how far it goes for a given swipe;
// way: 1 walks right, -1 left, as a swipe goes on (up, or to the left).
const ROWS = {
  within: { size: .84, gap: .3, pace: .34, way: 1, motion: 'swim' },
  small: { size: .9, gap: .3, pace: .56, way: -1, motion: 'walk' },
  big: { size: 1, gap: .26, pace: .74, way: 1, motion: 'walk' },
  garden: { size: 1.28, gap: -.02, pace: .44, way: -1, motion: 'sway' },
  creatures: { size: 1, gap: .28, pace: .6, way: 1, motion: 'walk' },
};

// ---------------------------------------------------------------- the order in a row

const family = d => d.name.split('-')[d.kind === 'microbe' ? 1 : 0];
// Shuffled, with no two of a kind (two slugs, two stars) side by side where that can be helped.
function spaced(list) {
  const left = shuffle(list), out = [];
  while (left.length) {
    const prev = out.at(-1), i = left.findIndex(d => !prev || family(d) !== family(prev));
    out.push(left.splice(Math.max(0, i), 1)[0]);
  }
  return out;
}
// The few spread evenly among the many.
function weave(many, few) {
  const n = many.length + few.length, phase = Math.random(), at = new Set(few.map((_, j) => Math.floor((j + phase) * n / few.length)));
  return Array.from({ length: n }, (_, i) => (at.has(i) && few.length ? few : many.length ? many : few).shift());
}
const of = (...kinds) => drawings.filter(d => kinds.includes(d.kind));
function order(key) {
  if (key === 'within') return weave(spaced(of('microbe')), shuffle(of('ring')));
  if (key === 'small') return spaced(of('bug'));
  if (key === 'garden') {
    const garden = of('plant', 'rock');
    return weave(spaced(garden.filter(d => SIZE[d.name] < TALL)), spaced(garden.filter(d => SIZE[d.name] >= TALL)));
  }
  // The lizards walk with the other animals, each one leaving a poop just behind it (bound to it: the two
  // keep close and stay on the same page).
  const lizards = shuffle(of('lizard')), poops = shuffle(of('poop')), animals = spaced(of('animal')), out = [];
  while (lizards.length || poops.length || animals.length) {
    const lizard = lizards.shift(), poop = poops.shift();
    out.push(poop && lizard ? { ...poop, bond: true } : poop, lizard, animals.shift());
  }
  const procession = out.filter(Boolean);
  return key === 'creatures' ? weave(procession, spaced(of('bug'))) : procession;
}

// ---------------------------------------------------------------- laying out a row

// Split the row into pages that each fill the stretch P exactly, whole drawings from one end to the other.
// As in justified type, the slack is shared between the gaps (kept close to the ideal) and the size of the
// drawings on that page (never more than a little bigger or smaller), so the rhythm stays even.
// Returns { pages: [{ figs, gap, scale }], score }, or null.
const GIVE = 0.15; // how much bigger or smaller a page's drawings may be
const BOND = 0.1; // the gap between a lizard and its poop, against the row's height
function justify(width, gaps, fixed, P, ideal) {
  const A = width, B = gaps, R = P - fixed - A - B * ideal, a = 1 / 0.06 ** 2, b = 1 / (0.3 * Math.max(Math.abs(ideal), 6)) ** 2;
  const k = R / (A * A / a + B * B / b);
  const u = clamp(k * A / a, -GIVE, GIVE), e = (R - u * A) / B;
  return { scale: 1 + u, gap: ideal + e, cost: a * u * u + b * e * e };
}
function paginate(figs, P, ideal, bond) {
  const n = figs.length, sum = [0], bonds = [0];
  for (const f of figs) { sum.push(sum.at(-1) + f.w); bonds.push(bonds.at(-1) + (f.bond ? 1 : 0)); }
  const fit = (i, j) => { const b = bonds[j - 1] - bonds[i]; return justify(sum[j] - sum[i], j - i - 1 - b, b * bond, P, ideal); };
  const cost = (i, j) => {
    if (j - i < 2 || figs[j - 1].bond) return Infinity; // a page never ends between a lizard and its poop
    const { gap, cost } = fit(i, j);
    return gap < ideal - Math.max(Math.abs(ideal), P * 0.02) * 0.6 ? Infinity : cost;
  };
  const guess = Math.round((sum[n] + n * ideal) / (P + ideal));
  let best = null;
  for (let pages = Math.max(1, guess - 1); pages <= Math.min(guess + 2, Math.floor(n / 2)); pages++) {
    // f[p][j]: the cheapest way to make p pages of the first j drawings
    const f = Array.from({ length: pages + 1 }, () => new Array(n + 1).fill(Infinity)), from = f.map(r => r.map(() => 0));
    f[0][0] = 0;
    for (let p = 1; p <= pages; p++) {
      for (let j = 2 * p; j <= n; j++) {
        for (let i = 2 * (p - 1); i <= j - 2; i++) {
          const c = f[p - 1][i] + cost(i, j);
          if (c < f[p][j]) { f[p][j] = c; from[p][j] = i; }
        }
      }
    }
    const score = f[pages][n] / pages;
    if (!(score < (best?.score ?? Infinity))) continue;
    const out = [];
    for (let p = pages, j = n; p > 0; j = from[p][j], p--) {
      out.unshift({ figs: figs.slice(from[p][j], j), ...fit(from[p][j], j) });
    }
    best = { score, pages: out };
  }
  return best;
}

let rows = [], width = 0, height = 0;

function makeRow(key, h, base, a, b, delay) {
  const spec = ROWS[key], P = b - a, ideal = spec.gap * h;
  // Where the drawings are too few to fill the row evenly, or to go round, they walk round twice (or more)
  // in the same order, so no page ever shows one drawing twice.
  const once = order(key);
  let best = null, last = null;
  for (let times = 1; times <= 4 && !(best && times > 2); times++) {
    const figs = Array.from({ length: times }, () => once).flat().map(d => {
      const fh = h * (SIZE[d.name] ?? 0.6);
      return { d, h: fh, w: fh * d.w / d.h, bond: d.bond };
    });
    const fit = paginate(figs, P, ideal, BOND * h);
    last = fit ?? last;
    if (!fit || fit.pages.length < 2) continue;
    const length = fit.pages.length * (P + h * 0.12);
    if (length < width + Math.max(...figs.map(f => f.w)) + a) continue;
    const score = fit.score * (1 + 0.2 * (times - 1));
    if (!best || score < best.score) best = { ...fit, score };
  }
  const pages = (best ?? last).pages;
  // The strip: the pages one after another, each seam as wide as the gaps on either side of it (and
  // never so narrow that the next page shows at the margin).
  const seamAfter = i => Math.max((pages[i].gap + pages[(i + 1) % pages.length].gap) / 2, h * 0.12);
  const starts = [];
  let x = 0;
  pages.forEach((page, i) => {
    starts.push(x);
    for (const f of page.figs) { f.w *= page.scale; f.h *= page.scale; f.x = x; x += f.w + (f.bond ? BOND * h : page.gap); }
    x = starts[i] + P + seamAfter(i);
  });
  const el = document.createElement('div');
  el.className = `row ${key}`;
  el.style.cssText = `height:${(h * 3).toFixed(1)}px;translate:0 ${(base - h * 3).toFixed(1)}px`; // room above for hops
  const all = pages.flatMap(p => p.figs);
  for (const f of all) {
    const img = f.el = new Image();
    img.src = `${folder}${f.d.name}.webp`;
    img.alt = '';
    img.className = 'fig';
    img.draggable = false;
    img.decoding = 'async';
    const look = RIGHT.has(f.d.name) ? 1 : LEFT.has(f.d.name) ? -1 : 0;
    const turn = spec.motion === 'walk' && look && look !== spec.way;
    img.style.cssText = `width:${f.w.toFixed(1)}px;height:${f.h.toFixed(1)}px;` +
      (turn ? '--fx:-1;' : '') + (UPSIDE_DOWN.has(f.d.name) ? '--fy:-1;--up:-100%;' : '');
    f.seed = Math.random() * 100;
    f.dy = 0;
    f.rot = 0;
    f.flex = clamp(f.h / h, 0.25, 1);
    if (key === 'garden' && SIZE[f.d.name] < TALL) img.style.zIndex = 1; // the low plants in front
  }
  el.append(...all.map(f => f.el));
  const seam = Math.min(...pages.map((_, i) => seamAfter(i)));
  const row = {
    key, el, figs: all, starts, L: x, a, b, P, h, seam, spec, rate: -spec.way * spec.pace,
    wrap: Math.max(...all.map(f => f.w)) + a + 2,
    x: starts[0] - a, v: 0, target: starts[0] - a, sv: 0, trip: 0, last: starts[0] - a,
  };
  place(row);
  for (const f of all) {
    const visible = f.sx > -f.w && f.sx < width;
    f.el.style.setProperty('--delay', `${visible ? delay + Math.round(f.sx / width * 380) : 0}ms`);
  }
  return row;
}

function build() {
  width = wall.clientWidth;
  height = wall.clientHeight;
  const pad = getComputedStyle(shelf), safe = k => parseFloat(pad[`padding${k}`]) || 0;
  // One column from the top inset down to the bottom edge, where the garden grows: the rows above, the
  // works, the rows below, with the same air between each and the next. A row is never taller than a
  // fifth of the width or so; on a tall screen the spare height goes into the air.
  const tall = Math.max(...works.map(work => work.offsetHeight)), room = height - safe('Top') - tall, air = 0.26;
  const stands = k => ROWS[k].size * (k === 'garden' ? 0.8 : 1); // few plants stand the garden's full height
  let plan, unit, gaps;
  for (plan of [[['within', 'small'], ['big', 'garden']], [['creatures'], ['garden']]]) {
    gaps = plan.flat().length + 1;
    unit = Math.min(150, width * 0.22, room / (plan.flat().reduce((s, k) => s + stands(k), 0) + gaps * air));
    if (unit >= 44) break;
  }
  const gap = (room - plan.flat().reduce((s, k) => s + stands(k) * unit, 0)) / gaps;
  // The face stands at the start of the garden, a little taller than the plants around it.
  nav.style.setProperty('--face', `${clamp(unit * ROWS.garden.size * 0.6, 48, 120).toFixed(0)}px`);
  const a = nav.offsetLeft, b = width - safe('Right') - (a - safe('Left')); // the face stands at the margin
  const faceEnd = nav.offsetLeft + nav.offsetWidth;
  rows = [];
  let y = safe('Top');
  const put = (key, base, from = a) => rows.push(makeRow(key, unit * ROWS[key].size, base, from, b, rows.length * 110));
  for (const k of plan[0]) put(k, y += gap + unit * stands(k));
  shelf.style.setProperty('--works-top', `${(y + gap - safe('Top')).toFixed(1)}px`);
  y += gap + tall;
  for (const k of plan[1]) {
    y += gap + unit * stands(k);
    if (k === 'garden') put(k, height, faceEnd + unit * ROWS.garden.size * ROWS.garden.gap);
    else put(k, y);
  }
  // Each row shows only its own stretch, so at rest nothing from the next page shows in the margins;
  // a drawing on its way in or out fades across the width of a gap. The garden's stretch starts after
  // the face: the plants pass behind it.
  for (const row of rows) {
    const from = row.key === 'garden' ? faceEnd - 8 : row.a - row.seam + 1, to = row.b + row.seam - 1;
    const mask = `linear-gradient(90deg, transparent ${from.toFixed(0)}px, #000 ${(row.a - 1).toFixed(0)}px, ` +
      `#000 ${(row.b + 1).toFixed(0)}px, transparent ${to.toFixed(0)}px)`;
    row.el.style.maskImage = row.el.style.webkitMaskImage = mask;
  }
  wall.classList.remove('ready', 'settled');
  wall.replaceChildren(...rows.map(r => r.el));
  requestAnimationFrame(() => requestAnimationFrame(() => wall.classList.add('ready')));
  clearTimeout(build.timer);
  build.timer = setTimeout(() => wall.classList.add('settled'), 1800);
}

// ---------------------------------------------------------------- moving

// Each drawing at its place on the strip, which goes round and round.
function place(row) {
  for (const f of row.figs) {
    const s = mod(f.x - row.x + row.wrap, row.L) - row.wrap;
    const shown = s > -f.w - 4 && s < width + 4;
    if (!shown && f.sx !== undefined && !(f.sx > -f.w - 4 && f.sx < width + 4)) { f.sx = s; continue; }
    f.sx = s;
    f.el.style.translate = `${s.toFixed(1)}px ${f.dy.toFixed(2)}px`;
    f.el.style.rotate = f.rot ? `${f.rot.toFixed(2)}deg` : '';
  }
}

// While a row moves, the creatures step along, the microbes wriggle and the plants lean back against the
// air. All of it fades out as the row slows down, so at rest every drawing stands straight.
function animate(row, dt) {
  const moved = row.x - row.last;
  row.last = row.x;
  row.trip += Math.abs(moved);
  row.sv += ((dt ? moved / dt : 0) - row.sv) * 0.2;
  const go = calm.matches ? 0 : Math.min(1, Math.abs(row.sv) / 260);
  for (const f of row.figs) {
    if (row.spec.motion === 'walk') f.dy = -Math.abs(Math.sin((row.trip + f.seed) / Math.max(14, f.w * 0.5) * Math.PI)) * f.h * 0.08 * go;
    else if (row.spec.motion === 'swim') f.rot = Math.sin((row.trip + f.seed) / Math.max(18, f.h * 0.9) * Math.PI) * 7 * go;
    else f.rot = clamp(row.sv * 0.006 * f.flex, -7, 7) * go;
  }
}

const SPRING = 110; // how firmly a row is pulled to where it comes to rest (per second squared)
let dragging = false, frame = 0, then = 0;
function tick(now) {
  const dt = then ? Math.min(0.05, (now - then) / 1000) : 1 / 60;
  then = now;
  let busy = dragging;
  for (const row of rows) {
    if (!dragging) {
      row.v += (-SPRING * (row.x - row.target) - 2 * Math.sqrt(SPRING) * row.v) * dt;
      row.x += row.v * dt;
      if (Math.abs(row.x - row.target) < 0.15 && Math.abs(row.v) < 3) { row.x = row.target; row.v = 0; }
    }
    animate(row, dt);
    if (row.x !== row.target || row.v || Math.abs(row.sv) > 2) busy = true;
    else { row.sv = 0; for (const f of row.figs) { f.dy = 0; f.rot = 0; } }
    place(row);
  }
  frame = busy ? requestAnimationFrame(tick) : 0;
  if (!busy) then = 0;
}
const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

// Where a row comes to rest: the nearest place where one page fills the row, leaning the way it was going.
function rest(row, x, lean) {
  const at = x + row.a + Math.sign(lean) * row.P * 0.3, lap = Math.floor(at / row.L) * row.L;
  let best = row.target, far = Infinity;
  for (const k of [-1, 0, 1]) for (const s of row.starts) {
    const c = lap + k * row.L + s, d = Math.abs(c - at);
    if (d < far) { far = d; best = c - row.a; }
  }
  return best;
}
// With reduced motion a swipe turns each row on by one page, without sliding.
function turn(sign) {
  for (const row of rows) {
    row.x = row.target = rest(row, row.x + Math.sign(row.rate * sign) * row.P * 0.5, row.rate * sign);
    row.v = 0;
    row.last = row.x;
    place(row);
  }
}

// One face looks out of the corner. Stir far enough and the other takes its place; the first one
// (Lucas) is there to begin with and stays about three times as long.
const stay = () => (faces[0].classList.contains('on') ? 1300 : 450) * (0.7 + Math.random() * 0.6);
let stirred = 0, enough = faces.length > 1 ? stay() : Infinity;
function stir(by) {
  if ((stirred += Math.abs(by)) < enough) return;
  for (const face of faces) face.classList.toggle('on');
  stirred = 0;
  enough = stay();
}

let touch = null, lastMoved = 0;
addEventListener('pointerdown', e => {
  touch = { x: e.clientX, y: e.clientY, pos: 0, moved: 0, trail: [[e.timeStamp, 0]] };
  dragging = !calm.matches;
  for (const row of rows) { row.v = 0; row.target = row.x; }
});
addEventListener('pointermove', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  touch.x = e.clientX;
  touch.y = e.clientY;
  const d = -(Math.abs(dx) > Math.abs(dy) ? dx : dy); // on: a swipe up, or to the left
  touch.pos += d;
  touch.moved += Math.abs(d);
  touch.trail.push([e.timeStamp, touch.pos]);
  while (touch.trail.length > 2 && e.timeStamp - touch.trail[0][0] > 90) touch.trail.shift();
  stir(d);
  if (calm.matches) return;
  for (const row of rows) row.x = row.target = row.x + d * row.rate;
  wake();
});
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, e => {
  if (!touch) return;
  const [t0, p0] = touch.trail[0], [t1, p1] = touch.trail.at(-1);
  const speed = e.timeStamp - t1 < 80 && t1 > t0 ? clamp((p1 - p0) / (t1 - t0) * 1000, -5000, 5000) : 0;
  lastMoved = touch.moved;
  dragging = false;
  if (calm.matches) {
    if (touch.moved > 30) turn(Math.sign(touch.pos));
  } else {
    stir(speed * 0.25);
    for (const row of rows) {
      row.v = speed * row.rate;
      row.target = rest(row, row.x + row.v * 0.26, row.v || row.x - row.target);
    }
    wake();
  }
  touch = null;
});
// The wheel (or two fingers on a trackpad) moves the rows a step at a time; they settle when it stops.
let wheeling, wheeled = 0;
addEventListener('wheel', e => {
  const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode ? 30 : 1);
  stir(d);
  wheeled += d;
  clearTimeout(wheeling);
  if (calm.matches) {
    wheeling = setTimeout(() => { if (Math.abs(wheeled) > 60) turn(Math.sign(wheeled)); wheeled = 0; }, 160);
    return;
  }
  for (const row of rows) row.target += d * row.rate;
  wheeling = setTimeout(() => {
    for (const row of rows) row.target = rest(row, row.target, wheeled * row.rate);
    wheeled = 0;
    wake();
  }, 140);
  wake();
}, { passive: true });

// ---------------------------------------------------------------- poking

// A tap you can feel. iPhones have no vibration for web pages, but flipping a switch gives a small
// tick (iOS 18 and later), so flip a hidden one. Other phones vibrate for a moment.
function tap() {
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

// Poke a drawing: it gives under the finger, then springs up, and the jump runs along its row both ways.
function hop(img, wait, height) {
  img.style.setProperty('--wait', `${wait}ms`);
  img.style.setProperty('--jump', `${-height}px`);
  img.style.setProperty('--kick', `${(Math.random() - 0.5) * 20}deg`);
  img.classList.remove('hop');
  void img.offsetWidth; // restart the animation
  img.classList.add('hop');
}
const centre = img => { const r = img.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
let pressed;
wall.addEventListener('pointerdown', e => {
  if (!e.target.classList.contains('fig')) return;
  pressed = e.target;
  pressed.classList.add('press');
});
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => pressed?.classList.remove('press'));
wall.addEventListener('click', e => {
  if (!e.target.classList.contains('fig') || lastMoved > 12) return;
  const row = rows.find(r => r.el === e.target.parentElement), [x] = centre(e.target), reach = Math.max(180, width * 0.4);
  for (const f of row.figs) {
    if (f.sx < -f.w || f.sx > width) continue;
    const far = Math.abs(centre(f.el)[0] - x);
    if (f.el === e.target) hop(f.el, 0, Math.max(28, row.h * 0.42));
    else if (far < reach) hop(f.el, 40 + far * 1.1, Math.max(5, row.h * 0.26 * (1 - far / reach)));
  }
  tap();
});
wall.addEventListener('animationend', e => e.target.classList.remove('hop'));
// A swipe that starts on the book, the diary or the face stirs the rows; it does not open them.
addEventListener('click', e => { if (e.detail && lastMoved > 12 && e.target.closest('a')) e.preventDefault(); }, true);

let timer;
addEventListener('resize', () => {
  if (wall.clientWidth === width && Math.abs(wall.clientHeight - height) < 40) return; // e.g. a toolbar sliding away
  clearTimeout(timer);
  timer = setTimeout(build, 200);
});
build();
