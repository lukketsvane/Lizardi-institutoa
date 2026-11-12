// The shelf, direction 2: friezes.
// The drawings walk in rows, like the borders of a printed page, each row with a character of its own:
// the microbes, the fliers, the small creatures, the lizards (each followed by its poop) with the other
// animals, and the garden, which grows from the ground. In a row every drawing stands upright, at one
// scale, and the gaps between them look even (they are measured between the ink, not the boxes). On an
// upright screen the rows run above and below the book and the diary; on a wide one the book and the
// diary stand taller in the middle, and the rows at their height run on either side of them, passing
// behind them. A swipe or the wheel sends each row sideways at its own pace, the creatures walking the
// way they face, and each row comes to rest showing whole drawings from margin to margin.
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
const sum = list => list.reduce((s, x) => s + x, 0);
const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(pair => pair[1]);

// Near-twins, the same drawing in other colours (or nearly), never show together: one of each set comes.
const TWINS = [
  ['microbe-dancing-pair-leaning', 'microbe-dancing-pair-upright'], ['microbe-spiral-green', 'microbe-spiral-green-2'],
  ['microbe-star-magenta', 'microbe-star-ochre-green'], ['microbe-star-orange-magenta', 'microbe-star-yellow-pink'],
  ['slug-hat-green', 'slug-hat-lavender', 'slug-hat-orange'], ['poop-tiny', 'poop-small-ragged'],
  ['mushrooms-orange', 'mushrooms-orange-purple-outline'], ['flower-head-blue', 'flower-head-orange', 'flower-head-pink'],
  ['grass-bent-bright-green', 'grass-bent-dark-olive'],
];
const twin = new Set(TWINS.flat()), chosen = new Set(TWINS.map(set => set[Math.random() * set.length | 0]));
// Left out: the rings, which read as holes among the microbes, and the lizard drawn hanging upside down,
// which has nothing here to hang from.
const drawings = JSON.parse(wall.dataset.sprites).map(([name, w, h, , kind]) => ({ name, w, h, kind }))
  .filter(d => d.kind !== 'ring' && d.name !== 'lizard-upside-down' && (!twin.has(d.name) || chosen.has(d.name)));

// How tall each drawing stands, as a share of its row: what it is, not how big it happens to be drawn.
// The lizards are the biggest of the creatures, a beetle is small, poop is smaller still.
const SIZE = {
  // under the microscope: all of a size
  'microbe-branched-blue': .8, 'microbe-branched-magenta': 1, 'microbe-budding-yellow': .6, 'microbe-chain-blue': 1,
  'microbe-cilia-brown-blue': .5, 'microbe-dancing-pair-leaning': .92, 'microbe-dancing-pair-upright': .92,
  'microbe-pill-pink-tufted': .56, 'microbe-rod-knobbed-pink': .7, 'microbe-rod-teal-pili': .9, 'microbe-rods-mustard': 1,
  'microbe-spiral-green': .96, 'microbe-spiral-green-2': .96, 'microbe-spiral-yellow': 1, 'microbe-star-magenta': .74,
  'microbe-star-ochre-green': .78, 'microbe-star-orange-magenta': .84, 'microbe-star-yellow-pink': .84,
  // the fliers
  'bird-purple-flying': .74, 'butterfly-magenta': .64, 'butterfly-orange': .74, 'fly-purple-front': .8, 'fly-blue-top-view': .58,
  // the small creatures
  'slug-big-yellow-green': 1, 'slug-hat-orange': .8, 'slug-hat-green': .76, 'slug-hat-lavender': .76, 'slug-pale-big-eye': .68,
  'slug-sleeping-mustard-pink-hat': .4, 'snail-pink-shell': .5, 'snail-yellow-brown-shell': .6, 'snail-upright-magenta': .9,
  'beetle-orange-small': .36, 'spider-teal': .8, 'worm-coiled-brown': .48, 'worm-thin-brown': .34, 'bug-green-sitting': .64,
  'bug-pink-round': .52,
  // the lizards, the other animals and the poop
  'lizard-leaping': 1, 'lizard-stretching': 1, 'lizard-running': .74, 'lizard-walking-tongue-out': .84,
  'frog-green': .6, 'mouse-sitting-orange': .7, 'cat-grey-purple': .66, 'squirrel-orange-leaping': .64, 'bird-purple-perched': .6,
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
// The fliers hover in the middle of their row instead of standing on its baseline.
const FLY = new Set(['bird-purple-flying', 'butterfly-magenta', 'butterfly-orange', 'fly-purple-front', 'fly-blue-top-view']);
// Which way the creatures look as drawn; in a row they are turned to look the way the row goes.
const RIGHT = new Set(['bird-purple-flying', 'bird-purple-perched', 'beetle-orange-small', 'slug-big-yellow-green', 'slug-hat-green',
  'slug-hat-lavender', 'slug-hat-orange', 'lizard-leaping', 'lizard-running', 'lizard-stretching', 'lizard-walking-tongue-out']);
const LEFT = new Set(['cat-grey-purple', 'squirrel-orange-leaping', 'slug-pale-big-eye', 'slug-sleeping-mustard-pink-hat',
  'snail-pink-shell', 'snail-upright-magenta', 'snail-yellow-brown-shell']);

// Where the ink is in each drawing: for twelve bands from top to bottom, how far in from the left of its box
// the ink starts and where it ends, in 36ths of the width ('-': none in that band). Measured from
// assets/sprites/; a drawing missing here is spaced by its box.
const INK = {
  'beetle-orange-small':'9p7s5u4u4x4z5z3z3x0u1vov', 'bird-purple-flying':'ll--2s2z2z5n0l0j1i9g6e8f',
  'bird-purple-perched':'fshufuev7v6zbr9q7p2s2t0h', 'branch-blossoms-pink':'8n7r7zas0i7h4h3f25242344',
  'branch-stump-brown':'rxpy8wnw3w0u0s1q1n4m5m4m', 'bug-green-sitting':'8m8m9lan8o8o8p6q6r3z0z0y',
  'bug-pink-round':'gq8s2u1v0w0w0w1w8xcxczaz', 'bulb-magenta':'elcobm7t3x0y0y0y1y2u9n57',
  'butterfly-magenta':'ai9v2x0y0z0z1y3z5z8y7o8l', 'butterfly-orange':'7u6u3u0y0z0z1y1y1y1x6vbr',
  'cat-grey-purple':'8x7x0w0w1v0t1t0u0vcwbw5z', 'fern-curls-lime':'151j2k4k1p1p1p7m8masdzgt',
  'flower-head-blue':'66--bp3y2z2y2z0z0x1t5ueu', 'flower-head-orange':'bp6x2z2z3x2z0z0y1s5u5uet',
  'flower-head-pink':'66--bp3y2z2y2y0z0x1t5ueu', 'flower-pink-on-stem':'1k0k0m1o6mczaybvbw6i5f5i',
  'flowers-pink-three-stems':'5b5b595v6v8r9zaz9u3o0m0n', 'flowers-purple-pair':'ar4r1r0q0q4s6u2w4xbzdzfz',
  'fly-blue-top-view':'st--etcwax8w0v9s0z6k7h8r', 'fly-purple-front':'an9ngk9s8w7t5t1x1z1xar6m',
  'frog-green':'xxcp0vaz4z3z3y3x3w4x3x3x', 'grass-arch-green':'uuovizjyiw7w5w4v3u1u5x3t',
  'grass-bent-bright-green':'ipgqexcyay8z7y4x3w1v0z0r', 'grass-bent-dark-olive':'qvivgwewbz9v7v4w2x0x09oo',
  'grass-curl-green':'mx7z3z2z1y0y0m0n2oeofogn', 'grass-fork-green':'9z9z0pdpeofogohoioipdpcp',
  'leaf-oak-green':'bxaz4p3t2t2t3s2q0o0n7j7h', 'leaf-oak-mustard':'iuexay8y8x3x6u7s8o0z3a06',
  'lizard-leaping':'1514252c3d0d0v3vbwfzmpnr', 'lizard-running':'0304152x3z5z3u2r3q3umuar',
  'lizard-stretching':'2246075p5x7z6w2q1v4x2q6t', 'lizard-walking-tongue-out':'02132536486x7z9zbucuavax',
  'microbe-branched-blue':'6d3s8ratdtam7n3z1p0qlqmq', 'microbe-branched-magenta':'6odm6m1v0z4ratavavag9j9j',
  'microbe-budding-yellow':'3w1y0z0z0z0z3z6y6x7v9ucq', 'microbe-chain-blue':'7o7vbybwhygz8r1i5h6n0n0j',
  'microbe-cilia-brown-blue':'bt9s7z6v4w0t2q1h1f1d2b28', 'microbe-dancing-pair-leaning':'cz9y6x2w0w0y4z4y8umtmroo',
  'microbe-dancing-pair-upright':'supuru8u7w5z3z1x0v1u6tps', 'microbe-pill-pink-tufted':'dqdudzaz6z4y3t0r0n0j2j3j',
  'microbe-rod-knobbed-pink':'gvgygz6y5v6u7m1l0d0d6e7e', 'microbe-rod-teal-pili':'gzbxaqcr7s6r6o5mar0s0pbq',
  'microbe-rods-mustard':'7j5j1t1v0w0ybz9z7j7q7v9i', 'microbe-spiral-green-2':'gxgyaz3h1s1g2l3a3a5b7c7d',
  'microbe-spiral-green':'2j1j0qjw7ykykxpxpxounsms', 'microbe-spiral-yellow':'ezezlvat7v4v1v0v0v1v3v6v',
  'microbe-star-magenta':'ipap9u9w6x6w7p5z1z0z0xcq', 'microbe-star-ochre-green':'jqcqbvbx8x8w1t0z0z2z2xer',
  'microbe-star-orange-magenta':'ad9o9z3z3x5t9u6u0s0m1nbn', 'microbe-star-yellow-pink':'gu6u5x6z9z1y0s0vbv6v8f8e',
  'mouse-sitting-orange':'iidq----6q6q6p7n1v0y4ppp', 'mushrooms-orange-purple-outline':'9h7h4g6v7x8y8z1y8v5wewjw',
  'mushrooms-orange':'9h7h4g6v7x8y8z1y8v5wewjw', 'mushrooms-pink-cap':'nylzkzkzkxlw1x0x0x0x0w3v',
  'mushrooms-trumpet-terracotta':'0y0z2x6s7p6u8lakaj7i7f7m', 'poop-large-brown':'dd----7r6q2s2z1u0t0u2t5t',
  'poop-log-olive':'ls1t0u0u0u1u1u2v3z4u1p0n', 'poop-on-green-plant':'ckan9p8s6w2y1z2yeydxgvhu',
  'poop-small-ragged':'mrjreq4w1w0v0v1t0t0v1y3x', 'poop-tiny-tall':'kpjpepat9v6x6z7y6x5w0u5d',
  'poop-tiny':'johodo8s7y7y7w5z4z1y0w--', 'rocks-stacked-purple':'al8n8o8o9n8r5t3u1v1w0x0z',
  'seed-pod-brown':'ap6q3u1z1w0y0u1q1q4s4jkk', 'seedling-green':'szpznzmy3w1s0o2n9okpjpen',
  'shrub-buds-mauve':'8s6tct4t0tau8v8xazdudtkp', 'slug-big-yellow-green':'tzrzmxjygyeycu8u2t0s0s2q',
  'slug-hat-green':'kvkwivjwixixhvev7u4x0zyz', 'slug-hat-lavender':'kvkwivjwixhxhvev7u4x0zyz',
  'slug-hat-orange':'kukwiwjwixhxhvev7u4w0zyz', 'slug-pale-big-eye':'7h8iaman9o8o4p2t1u1z0w07',
  'slug-sleeping-mustard-pink-hat':'6n5p1p0q0y0z1z4z4y5x9ygy', 'snail-pink-shell':'78tt--go0r0s1s1s0r1y8zdz',
  'snail-upright-magenta':'5f5e2c1s2x4y4y6y9uam8l7i', 'snail-yellow-brown-shell':'4n4q4r0r0r1u3y4z5z6v6g7e',
  'spider-teal':'ikekbu9w2x1y0y0z0z0x0w5u', 'sprig-buds-olive':'at--nn0z3r2s4p2m2g2fbqcf',
  'sprout-curl-olive-purple':'4z--ii6v0v0u5s7j0m0i--cc', 'sprout-curl-tall-green':'jx2y0z0z1y3veseibieieiai',
  'squirrel-orange-leaping':'ryozmz3y3x3s1q1p0m0m4m4c', 'stem-bent-green':'uzszmzjygrcq8q8q8w9tao0f',
  'stem-forked-green-buds':'5h0u0y2y8o6l6s5s4e4e4i9h', 'stone-wall-purple':'7ohp5p2w1y1y1z1z0z0z0z1z',
  'twig-forked-brown':'1o0o0o2q5s9tfuiwjxnyjzhz', 'twig-with-leaves-grey':'qvnw5w4v3s4y9z8z0z0y0x2v',
  'weed-spiky-olive':'tznvnzpzkx5u2s2r4u1u1r1t', 'worm-coiled-brown':'bi5q5u3x4y4z7zuzqyev0w0n',
  'worm-thin-brown':'bz----4n1p1vkvioan9j01kn',
};

// The rows. size: the row's height against the others; gap: between the ink of neighbours, against the
// row's height; least: the closest the ink may come anywhere (in the garden the low plants stand a little
// in front of the tall ones); pace: how far it goes for a given swipe; way: 1 goes right, -1 left, as a
// swipe goes on (up, or to the left). within: the microbes; small: the small creatures; big: the lizards,
// each followed by its poop, and the other animals (split in two, lizards and animals, where there is room
// for more rows); smallAll: the small creatures and the fliers in one row; creatures: all of them in one.
const ROWS = {
  within: { size: .74, gap: .34, least: .1, pace: .34, way: 1, motion: 'swim' },
  fliers: { size: .78, gap: 1.5, least: .2, pace: .5, way: -1, motion: 'fly' }, // few, and far apart: the sky
  small: { size: .9, gap: .32, least: .08, pace: .56, way: -1, motion: 'walk' },
  smallAll: { size: .9, gap: .32, least: .08, pace: .56, way: -1, motion: 'walk' },
  animals: { size: .84, gap: .4, least: .08, pace: .66, way: 1, motion: 'walk' },
  lizards: { size: 1, gap: .4, least: .08, pace: .74, way: 1, motion: 'walk' },
  big: { size: 1, gap: .36, least: .08, pace: .74, way: 1, motion: 'walk' },
  creatures: { size: 1, gap: .32, least: .08, pace: .6, way: 1, motion: 'walk' },
  garden: { size: 1.28, gap: -.04, least: -.14, pace: .44, way: -1, motion: 'sway' },
};
const BOND = .08; // the gap between a creature and the poop it leaves, against the row's height

// The ways the rows can stand, from the top: [above the works, beside them, below them]. The garden is
// always last, on the ground. Upright, the works stand side by side across the width; wide, they stand as
// tall as the rows beside them.
const UPRIGHT = [
  [['within', 'fliers', 'small'], [], ['big', 'garden']],
  [['within', 'smallAll'], [], ['big', 'garden']],
  [['creatures'], [], ['garden']],
];
const WIDE = [
  [[], ['within', 'fliers', 'small', 'big'], ['garden']],
  [[], ['within', 'smallAll', 'big'], ['garden']],
  [['within'], ['fliers', 'small', 'animals', 'lizards'], ['garden']],
  [['within'], ['fliers', 'small', 'big'], ['garden']],
  [['within', 'small'], ['fliers', 'animals', 'lizards'], ['garden']],
  [['within'], ['smallAll', 'big'], ['garden']],
  [[], ['smallAll', 'big'], ['garden']],
];
const WORKS = 1288 / 1820 + 2550 / 3300; // the width of the book and the diary together, against their height

// ---------------------------------------------------------------- what goes in a row

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
  many = [...many];
  few = [...few];
  const n = many.length + few.length, phase = Math.random(), at = new Set(few.map((_, j) => Math.floor((j + phase) * n / few.length)));
  return Array.from({ length: n }, (_, i) => (at.has(i) && few.length ? few : many.length ? many : few).shift());
}
const of = (...kinds) => drawings.filter(d => kinds.includes(d.kind) && !FLY.has(d.name));
const fliers = drawings.filter(d => FLY.has(d.name));
// Each lizard leaves a poop behind it, and so does an animal or two, as long as the poop lasts.
const dung = shuffle(of('poop')), poopOf = new Map([...shuffle(of('lizard')), ...shuffle(of('animal'))].map((d, i) => [d.name, dung[i]]));

// A row's drawings in order along it, in units that stay together: a drawing, or a creature with its poop.
function units(key, way) {
  const one = list => list.map(d => [d]);
  const leaving = d => { const poop = poopOf.get(d.name); return !poop ? [d] : way > 0 ? [poop, d] : [d, poop]; };
  const lizards = shuffle(of('lizard')).map(leaving), animals = spaced(of('animal')).map(leaving);
  if (key === 'within') return one(spaced(of('microbe')));
  if (key === 'fliers') return one(spaced(fliers));
  if (key === 'small') return one(spaced(of('bug')));
  if (key === 'smallAll') return one(spaced([...of('bug'), ...fliers]));
  if (key === 'lizards') return lizards;
  if (key === 'animals') return animals;
  if (key === 'big') return weave(animals, lizards);
  if (key === 'creatures') return weave(weave(animals, lizards), one(spaced([...of('bug'), ...fliers])));
  const garden = of('plant', 'rock');
  return one(weave(spaced(garden.filter(d => SIZE[d.name] < TALL)), spaced(garden.filter(d => SIZE[d.name] >= TALL))));
}

// ---------------------------------------------------------------- the gaps between neighbours

const profiles = new Map();
function profile(name) {
  if (!profiles.has(name)) {
    const s = INK[name];
    profiles.set(name, s && Array.from({ length: s.length / 2 }, (_, k) => s[2 * k] === '-' ? null :
      [parseInt(s[2 * k], 36) / 35, parseInt(s[2 * k + 1], 36) / 35]));
  }
  return profiles.get(name);
}
// A figure is { d, w, h, lift, turn }: lift is its height above the baseline, and turned it is mirrored.
// How far in from the right (side 1) or left (side 0) of its box its ink is at height y, or null.
function inset(f, side, y) {
  const p = profile(f.d.name), e = p?.[clamp(Math.floor((f.lift + f.h - y) / f.h * p.length), 0, p.length - 1)];
  if (!e) return p ? null : 0;
  const [l, r] = f.turn ? [1 - e[1], 1 - e[0]] : e;
  return f.w * (side ? 1 - r : l);
}
// The nearest the ink of a figure comes to one side of its box between two heights.
function facing(f, side, lo, hi) {
  const all = Array.from({ length: 12 }, (_, i) => inset(f, side, lo + (i + 0.5) * (hi - lo) / 12)).filter(x => x !== null);
  return all.length ? Math.min(...all) : 0;
}
// The gap between the boxes of two neighbours (A on the left) that makes the ink between them read as `gap`:
// the ink's distance is averaged over the height they share, a deep hollow counting only so deep, and
// nowhere does the ink come closer than `least`. Neighbours at different heights (a flier beside a worm)
// are as far apart as the gap across the diagonal.
function boxGap(A, B, gap, least) {
  const lo = Math.max(A.lift, B.lift), hi = Math.min(A.lift + A.h, B.lift + B.h);
  if (!profile(A.d.name) || !profile(B.d.name)) return gap;
  if (hi - lo < 2) return Math.sqrt(Math.max(0, gap * gap - (lo - hi) ** 2)) - facing(A, 1, A.lift, A.lift + A.h) - facing(B, 0, B.lift, B.lift + B.h);
  const reach = Array.from({ length: 12 }, (_, i) => {
    const y = lo + (i + 0.5) * (hi - lo) / 12, ia = inset(A, 1, y), ib = inset(B, 0, y);
    return ia !== null && ib !== null ? ia + ib : Infinity;
  });
  const near = Math.min(...reach);
  if (near === Infinity) return gap;
  const deep = Math.max(gap, 0) + 0.3 * (hi - lo), seen = d => sum(reach.map(r => Math.min(d + r, deep))) / reach.length;
  let a = gap - near - deep, b = gap; // seen(a) < gap <= seen(b)
  for (let i = 0; i < 20; i++) { const m = (a + b) / 2; if (seen(m) < gap) a = m; else b = m; }
  return Math.max(b, least - near);
}
// A poop lies just behind the creature that left it, clear of it up to a little above the poop's own height:
// it never slips in under a raised tail.
function bondGap(A, B, gap) {
  const top = Math.min(A.h, B.h) * 1.25;
  return gap - facing(A, 1, A.lift, A.lift + Math.min(top, A.h)) - facing(B, 0, B.lift, B.lift + Math.min(top, B.h));
}

// ---------------------------------------------------------------- laying out a row

// Split the row into pages that each fill the stretch P, whole drawings from one end to the other. As in
// justified type, the slack is shared between the gaps (kept close to the ideal), the size of the drawings
// on that page (never more than a shade bigger or smaller, so neighbouring pages match) and, a little, the
// margins at the two ends. A figure carries its box gap to the next one: f.bond (with its poop, fixed) or
// the ideal gap less f.kern. A page holds at most `most` drawings. Returns { pages: [{ figs, gap, scale, slack }], score }.
const GIVE = 0.05;
function justify(A, B, P, ideal) {
  const R = P - A - B * ideal, unit = Math.max(Math.abs(ideal), P * 0.02);
  const wa = 1 / 0.025 ** 2, wb = 1 / (0.3 * unit) ** 2, wr = 1 / (0.5 * unit) ** 2;
  // Each takes a share of R in proportion to how cheap it is (the least-squares split), the size first.
  const share = r => (B ? B * B / wb : 0) + (r > 0 ? 1 / wr : 0); // the margins only ever take up room
  const u = clamp(R * (A / wa) / (A * A / wa + share(R)), -GIVE, GIVE), rest = R - u * A;
  const e = B ? rest * (B / wb) / share(rest) : 0, slack = rest - e * B;
  // A page that cannot be made to fit is the last resort (its drawings crowd, or reach past the margins).
  const cost = wa * u * u + wb * e * e + wr * slack * slack + (slack < -0.5 ? 1e6 : 0);
  return { scale: 1 + u, gap: ideal + e, slack, cost };
}
function paginate(figs, P, ideal, most) {
  const n = figs.length, run = new Float64Array(n + 1), free = new Float64Array(n + 1);
  figs.forEach((f, i) => { run[i + 1] = run[i] + f.w + (f.bond ? f.box : -f.kern); free[i + 1] = free[i] + (f.bond ? 0 : 1); });
  const fit = (i, j) => justify(run[j - 1] - run[i] + figs[j - 1].w, free[j - 1] - free[i], P, ideal);
  const squeezed = ideal - Math.max(Math.abs(ideal), P * 0.02) * 0.5, costs = new Float64Array(n * most).fill(-1);
  const cost = (i, j) => {
    if (figs[j - 1].bond || j - i > most) return Infinity; // a page never ends between a creature and its poop
    const k = (j - 1) * most + j - i - 1;
    if (costs[k] < 0) {
      const { gap, cost } = fit(i, j);
      // a page of one drawing, or with its gaps squeezed, only where nothing else will do
      costs[k] = cost + (j - i < 2 ? 1e4 : 0) + (gap < squeezed ? 1e5 : 0);
    }
    return costs[k];
  };
  const guess = Math.round((run[n] + free[n] * ideal) / (P + ideal)), fewest = Math.max(1, Math.ceil(n / most)), first = Math.max(fewest, guess - 1);
  // f[p][j]: the cheapest way to make p pages of the first j drawings; the right number of pages is near the guess
  const top = Math.max(first + 1, Math.min(guess + 2, n));
  const f = Array.from({ length: top + 1 }, () => new Float64Array(n + 1).fill(Infinity)), from = f.map(() => new Int32Array(n + 1));
  f[0][0] = 0;
  for (let p = 1; p <= top; p++) {
    for (let j = p; j <= n; j++) {
      for (let i = Math.max(p - 1, j - most); i <= j - 1; i++) {
        if (f[p - 1][i] === Infinity) continue;
        const c = f[p - 1][i] + cost(i, j);
        if (c < f[p][j]) { f[p][j] = c; from[p][j] = i; }
      }
    }
  }
  let best = null;
  for (let pages = first; pages <= top; pages++) {
    const score = f[pages][n] / pages;
    if (!(score < (best?.score ?? Infinity))) continue;
    const out = [];
    for (let p = pages, j = n; p > 0; j = from[p][j], p--) out.unshift({ figs: figs.slice(from[p][j], j), ...fit(from[p][j], j) });
    best = { score, pages: out };
  }
  if (best) return best;
  // Nothing fits (a stretch narrower than its widest creature): a drawing or a creature with its poop a page.
  const pages = [];
  for (let i = 0; i < n; i++) if (!i || !figs[i - 1].bond) pages.push(i);
  return { score: Infinity, pages: pages.map((i, k) => ({ figs: figs.slice(i, pages[k + 1] ?? n), ...fit(i, pages[k + 1] ?? n) })) };
}

let rows = [], width = 0, height = 0;

// One row: its drawings on a strip that goes round and round, shown from lo to hi (fading in and out
// across the margins), coming to rest with one page from a to b.
function makeRow({ key, line, h, base, a, b, edge = [], seamMin = 0, list, delay }) {
  const spec = ROWS[key], P = b - a, ideal = spec.gap * h;
  const span = (edge[1] ?? b + h) - (edge[0] ?? a - h); // how much of the strip shows at once, about
  // Once round the row: each drawing at its height, with the gap to the next one.
  const lap = list.flatMap(unit => unit.map((d, i) => {
    const fh = h * (SIZE[d.name] ?? 0.6), fly = FLY.has(d.name), look = RIGHT.has(d.name) ? 1 : LEFT.has(d.name) ? -1 : 0;
    const turn = spec.motion !== 'swim' && look && look !== spec.way; // to look the way the row goes
    return { d, w: fh * d.w / d.h, h: fh, lift: fly ? (h - fh) / 2 : 0, fly, turn, bond: i < unit.length - 1 };
  }));
  lap.forEach((f, i) => {
    const next = lap[(i + 1) % lap.length];
    if (f.bond) f.box = bondGap(f, next, BOND * h);
    f.kern = ideal - boxGap(f, next, ideal, spec.least * h);
  });
  // Never the whole row on one page, so that each page brings a different few. Where the drawings are too
  // few to fill the row evenly, or to go round, they walk round twice (or more) in the same order, so no
  // page ever shows one drawing twice.
  const most = lap.length < 5 ? lap.length : Math.ceil(lap.length * 0.8);
  let best = null, last = null, worse = 0;
  for (let times = 1; times <= 8 && (times < 3 || times * lap.length <= 120) && worse < 2; times++) {
    const figs = Array.from({ length: times }, () => lap.map(f => ({ ...f }))).flat(), fit = paginate(figs, P, ideal, most);
    last = fit;
    if (fit.pages.length < 2) continue;
    const length = fit.pages.length * (P + h * 0.12);
    if (length < span + Math.max(...figs.map(f => f.w)) + 8) continue;
    const score = fit.score * (1 + 0.1 * (times - 1));
    if (!best || score < best.score) { best = { ...fit, score }; worse = 0; } else worse++;
    if (best.score < 0.4) break; // good enough
  }
  const pages = (best ?? last).pages;
  // The strip: the pages one after another, each seam as wide as the gaps on either side of it (and
  // never so narrow that the next page shows at the margin).
  const seamAfter = i => {
    const page = pages[i], next = pages[(i + 1) % pages.length], f = page.figs.at(-1);
    return Math.max((page.gap + next.gap) / 2 - f.kern * page.scale, h * 0.12, seamMin) + (page.slack + next.slack) / 2;
  };
  const starts = [];
  let x = 0;
  pages.forEach((page, i) => {
    starts.push(x);
    let fx = x + page.slack / 2;
    for (const f of page.figs) {
      for (const k of ['w', 'h', 'lift', 'box', 'kern']) if (f[k] !== undefined) f[k] *= page.scale;
      f.x = fx;
      fx += f.w + (f.bond ? f.box : page.gap - f.kern);
    }
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
    img.style.cssText = `width:${f.w.toFixed(1)}px;height:${f.h.toFixed(1)}px;` + (f.lift ? `bottom:${f.lift.toFixed(1)}px;` : '') + (f.turn ? '--fx:-1;' : '');
    f.seed = Math.random() * 100;
    f.dy = 0;
    f.rot = 0;
    f.flex = clamp(f.h / h, 0.25, 1);
    f.motion = f.fly ? 'fly' : spec.motion;
    if (key === 'garden' && SIZE[f.d.name] < TALL) img.style.zIndex = 1; // the low plants in front
  }
  el.append(...all.map(f => f.el));
  const seam = Math.min(...pages.map((_, i) => seamAfter(i)));
  // Shown from lo to hi: across a seam's width beyond each end of the stretch, unless an edge is given.
  const lo = edge[0] ?? a - seam + 1, hi = edge[1] ?? b + seam - 1, maxW = Math.max(...all.map(f => f.w));
  const mask = `linear-gradient(90deg, transparent ${lo.toFixed(0)}px, #000 ${(a - 1).toFixed(0)}px, #000 ${(b + 1).toFixed(0)}px, transparent ${hi.toFixed(0)}px)`;
  el.style.maskImage = el.style.webkitMaskImage = mask;
  const row = {
    key, line, el, figs: all, starts, L: x, a, b, P, h, lo, hi, from: lo - maxW - 4, spec, rate: -spec.way * spec.pace,
    x: starts[0] - a, v: 0, target: starts[0] - a, sv: 0, trip: 0, last: starts[0] - a,
  };
  place(row);
  for (const f of all) {
    const visible = f.sx > -f.w && f.sx < width;
    f.el.style.setProperty('--delay', `${visible ? delay + Math.round(f.sx / width * 380) : 0}ms`);
  }
  return row;
}

// ---------------------------------------------------------------- the page

// How the rows and the works share the height from the top inset down to the ground, and how big they are:
// u, the height of a row of size 1; air, between one row and the next. Wide, the works stand as tall as the
// rows beside them, which must have room for two drawings or so on either side; of the ways that fit, the
// one with the biggest works wins, unless it is much airier or its drawings are getting small.
function arrange(room, span, gapW, wide) {
  const cap = Math.min(width * 0.22, Math.max(150, height * 0.16));
  const stand = k => ROWS[k].size * (k === 'garden' ? 0.8 : 1); // few plants stand the garden's full height
  const sizes = keys => sum(keys.map(stand));
  let best = null;
  if (wide) {
    for (const [above, beside, below] of WIDE) {
      const out = sizes([...above, ...below]), by = sizes(beside), gaps = above.length + beside.length + below.length;
      for (let rho = 0.28; rho < 1.3; rho += 0.02) {
        let u = room / (out + by + gaps * rho), air = rho * u;
        if (u > cap) { u = cap; air = (room - (out + by) * u) / gaps; }
        const wh = by * u + (beside.length - 1) * air, side = (span - WORKS * wh - gapW) / 2 - Math.max(0.35 * u, 12);
        if (u < 54 || side < 2 * u) continue;
        const score = wh / room - 0.5 * Math.max(0, air / u - 0.3) - 0.008 * Math.max(0, 64 - u);
        if (!best || score > best.score) best = { above, beside, below, u, air, wh, score, stand };
        break;
      }
    }
    if (best) return best;
  }
  // Upright: the works across the width (or no taller than about two fifths of the height); then as many
  // rows as stand at full size, at least two.
  const wh = Math.min((span - gapW) / WORKS, height * (wide ? (height > 520 ? 0.44 : 0.5) : 0.4));
  for (const [above, beside, below] of UPRIGHT) {
    const out = sizes([...above, ...below]), gaps = above.length + below.length + 1;
    const u = Math.min(cap, (room - wh) / (out + gaps * 0.28)), air = (room - wh - out * u) / gaps;
    best = { above, beside, below, u, air, wh, stand };
    if (above.length > 2 ? u >= 0.9 * cap : u >= 44) break;
  }
  return best;
}

function build() {
  width = wall.clientWidth;
  height = wall.clientHeight;
  const pad = getComputedStyle(shelf), inset = k => parseFloat(pad[`padding${k}`]) || 0;
  // The garden grows from the ground: the bottom edge, or a little above the home indicator.
  const ground = height - inset('Bottom') - (inset('Bottom') ? 8 : 0);
  shelf.style.setProperty('--ground', `${(height - ground).toFixed(1)}px`);
  const a = nav.offsetLeft, b = width - inset('Right') - (a - inset('Left')); // the margins, where the face stands
  const gapW = clamp(width * 0.04, 14, 60);
  const plan = arrange(ground - inset('Top'), b - a, gapW, width > height * 1.08);
  const { u, air, stand } = plan;
  // One column from the top inset down to the ground: the rows above, the works (with the rows beside
  // them), the rows below, with the same air between each and the next.
  const lines = [];
  let y = inset('Top') + air;
  const add = (key, base, beside) => lines.push({ key, base, beside, h: u * ROWS[key].size });
  for (const k of plan.above) { add(k, y += stand(k) * u, false); y += air; }
  const top = y;
  for (const k of plan.beside) { add(k, y += stand(k) * u, true); y += air; }
  y = top + plan.wh + air;
  for (const k of plan.below) {
    if (k === 'garden') add(k, ground, false);
    else { add(k, y += stand(k) * u, false); y += air; }
  }
  shelf.style.setProperty('--wh', `${plan.wh.toFixed(1)}px`);
  shelf.style.setProperty('--works-top', `${(top - inset('Top')).toFixed(1)}px`);
  // The face stands at the start of the garden, a little taller than the plants around it.
  nav.style.setProperty('--face', `${clamp(u * ROWS.garden.size * 0.6, 48, 120).toFixed(0)}px`);
  const faceEnd = nav.offsetLeft + nav.offsetWidth;
  const inner = [Math.min(...works.map(w => w.offsetLeft)), Math.max(...works.map(w => w.offsetLeft + w.offsetWidth))];
  rows = [];
  lines.forEach((line, i) => {
    const list = units(line.key, ROWS[line.key].way), delay = i * 110, h = line.h, base = line.base;
    if (line.key === 'garden') {
      // the garden's stretch starts after the face: the plants pass behind it
      rows.push(makeRow({ key: 'garden', line: i, h, base, a: faceEnd + 0.08 * h, b, edge: [faceEnd - 8], list, delay }));
    } else if (line.beside) {
      // either side of the works: half the row on each, coming to rest the same distance from them
      const gap = Math.max(0.35 * u, 12), P = Math.min(inner[0] - gap - a, b - inner[1] - gap);
      const halves = [list.filter((_, j) => j % 2 === 0), list.filter((_, j) => j % 2)];
      const side = { key: line.key, line: i, h, base, seamMin: gap + 2, delay };
      rows.push(makeRow({ ...side, a: inner[0] - gap - P, b: inner[0] - gap, edge: [undefined, inner[0]], list: halves[0] }));
      rows.push(makeRow({ ...side, a: inner[1] + gap, b: inner[1] + gap + P, edge: [inner[1]], list: halves[1] }));
    } else {
      rows.push(makeRow({ key: line.key, line: i, h, base, a, b, list, delay }));
    }
  });
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
    const s = row.from + mod(f.x - row.x - row.from, row.L);
    const shown = s > row.lo - f.w - 4 && s < row.hi + 4;
    if (!shown && f.sx !== undefined && !(f.sx > row.lo - f.w - 4 && f.sx < row.hi + 4)) { f.sx = s; continue; }
    f.sx = s;
    f.el.style.translate = `${s.toFixed(1)}px ${f.dy.toFixed(2)}px`;
    f.el.style.rotate = f.rot ? `${f.rot.toFixed(2)}deg` : '';
  }
}

// While a row moves, the creatures step along, the fliers flutter, the microbes wriggle and the plants lean
// back against the air. All of it fades out as the row slows down, so at rest every drawing stands straight.
function animate(row, dt) {
  const moved = row.x - row.last;
  row.last = row.x;
  row.trip += Math.abs(moved);
  row.sv += ((dt ? moved / dt : 0) - row.sv) * 0.2;
  const go = calm.matches ? 0 : Math.min(1, Math.abs(row.sv) / 260);
  for (const f of row.figs) {
    const phase = (row.trip + f.seed) * Math.PI;
    if (f.motion === 'walk') f.dy = -Math.abs(Math.sin(phase / Math.max(14, f.w * 0.5))) * f.h * 0.08 * go;
    else if (f.motion === 'fly') { f.dy = Math.sin(phase / Math.max(40, f.w * 1.6)) * f.h * 0.14 * go; f.rot = Math.sin(phase / Math.max(22, f.w * 0.7)) * 5 * go; }
    else if (f.motion === 'swim') f.rot = Math.sin(phase / Math.max(18, f.h * 0.9)) * 7 * go;
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

// Poke a drawing: it gives under the finger, then springs up, and the jump runs along its row both ways
// (on both sides of the works, where the row runs beside them).
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
  for (const r of rows.filter(r => r.line === row.line)) {
    for (const f of r.figs) {
      if (f.sx < r.lo - f.w || f.sx > r.hi) continue;
      const far = Math.abs(centre(f.el)[0] - x);
      if (f.el === e.target) hop(f.el, 0, Math.max(28, row.h * 0.42));
      else if (far < reach) hop(f.el, 40 + far * 1.1, Math.max(5, row.h * 0.26 * (1 - far / reach)));
    }
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
