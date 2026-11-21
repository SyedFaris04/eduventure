import { Group, Mesh, MeshStandardMaterial } from 'three'
import { material } from '../hero/materials'
import { glow, toParts, type ModelPart, type Part } from './harvestProps'
import { geometry } from '../hero/materials'

/**
 * Things to build on My island (content/island-items.json), built from simple shapes like the camp props. Each model is
 * centred on its footprint (w along x, h along z, before turning) with its feet at y = 0.
 */
type V3 = [number, number, number]
const m = material
const leaves = new Map<string, MeshStandardMaterial>()
const leaf = (c: string) => {
  let l = leaves.get(c)
  if (!l) leaves.set(c, (l = new MeshStandardMaterial({ color: c, roughness: 0.85 })))
  return l
}
const C = {
  wood: '#9b6b43', dark: '#6e4a2e', light: '#c9a27a', thatch: '#cfae6e', roof: '#c8553d', white: '#f4efe6', cream: '#fff3d6',
  stone: '#a8a29e', stoneDark: '#8a847e', leaf: '#5aa83c', leaf2: '#6dbb4a', soil: '#7a5233', water: '#5fb7e5', sand: '#e9d8a6',
}
const box = (c: string, at: V3, size: V3, rot?: V3): Part => ['box', m(c), at, size, rot]
const ball = (c: string, at: V3, size: V3): Part => ['sphere', m(c), at, size]
const leafy = (c: string, at: V3, size: V3): Part => ['sphere', leaf(c), at, size]
const post = (c: string, x: number, z: number, h: number, r = 0.1): Part => ['cylinder', m(c), [x, h / 2, z], [r, h, r]]
const flowers = (c: string, pts: [number, number][], y = 0.3, s = 0.12): Part[] => pts.map(([x, z]) => ball(c, [x, y, z], [s, s, s]))

const MODELS: Record<string, () => Part[]> = {
  // ---- Houses
  house_pondok: () => [
    ...[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([x, z]) => post(C.dark, x, z, 0.45)),
    box(C.wood, [0, 0.45, 0], [1.7, 0.12, 1.7]),
    box(C.light, [0, 0.95, 0], [1.4, 0.9, 1.3]),
    box(C.dark, [0, 0.8, 0.66], [0.35, 0.6, 0.04]),
    ['cone', m(C.thatch), [0, 1.75, 0], [1.95, 0.8, 1.95]],
  ],
  house_kampung: () => [
    ...[-1.2, 0, 1.2].flatMap((x) => [-1.1, 1.1].map((z) => post(C.dark, x, z, 0.7))),
    box(C.wood, [0, 0.7, 0], [2.7, 0.14, 2.5]),
    box(C.light, [0, 1.3, -0.1], [2.3, 1.1, 2.0]),
    box(C.dark, [0, 1.15, 0.91], [0.45, 0.8, 0.04]),
    box('#4f86b0', [-0.75, 1.4, 0.91], [0.45, 0.35, 0.04]),
    box('#4f86b0', [0.75, 1.4, 0.91], [0.45, 0.35, 0.04]),
    ...[0.18, 0.36, 0.54].map((y, i): Part => box(C.wood, [0, y, 1.3 - i * 0.12], [0.6, 0.06, 0.22])),
    box(C.roof, [-0.65, 2.3, -0.1], [1.5, 0.12, 2.4], [0, 0, 0.55]),
    box(C.roof, [0.65, 2.3, -0.1], [1.5, 0.12, 2.4], [0, 0, -0.55]),
  ],
  house_twostorey: () => [
    box(C.white, [0, 0.65, 0], [2.6, 1.3, 2.5]),
    box(C.cream, [0, 1.8, -0.1], [2.2, 1.0, 2.1]),
    box(C.dark, [0, 0.5, 1.26], [0.5, 1.0, 0.04]),
    ...[-0.8, 0.8].map((x): Part => box('#4f86b0', [x, 0.8, 1.26], [0.5, 0.45, 0.04])),
    ...[-0.55, 0.55].map((x): Part => box('#4f86b0', [x, 1.85, 0.96], [0.45, 0.4, 0.04])),
    box(C.wood, [0, 1.32, 1.12], [2.4, 0.08, 0.3]),
    ['cone', m(C.roof), [0, 2.75, -0.1], [2.9, 0.9, 2.9]],
  ],
  house_villa: () => [
    box(C.white, [-0.4, 0.7, 0], [2.9, 1.4, 2.6]),
    box(C.cream, [1.35, 0.55, 0.2], [1.2, 1.1, 2.1]),
    box('#ececec', [-0.4, 1.47, 0], [3.1, 0.14, 2.8]),
    box('#ececec', [1.35, 1.12, 0.2], [1.35, 0.12, 2.3]),
    ...[-1.3, -0.4, 0.5].map((x): Part => box('#7cc7f0', [x, 0.85, 1.31], [0.6, 0.7, 0.04])),
    box(C.dark, [1.35, 0.45, 1.26], [0.45, 0.9, 0.04]),
    box(C.water, [1.35, 0.03, -1.1], [1.1, 0.06, 0.6]),
    ['cone', m(C.roof), [-0.4, 1.95, 0], [2.2, 0.8, 2.2]],
  ],

  // ---- Garden
  bush_round: () => [leafy(C.leaf, [0, 0.35, 0], [0.8, 0.7, 0.8])],
  bush_pink: () => [leafy(C.leaf2, [0, 0.35, 0], [0.8, 0.7, 0.8]), ...flowers('#ff8fc7', [[0.25, 0.25], [-0.2, 0.28], [0.05, -0.3], [-0.28, -0.05], [0.3, -0.1]], 0.5)],
  bush_yellow: () => [leafy(C.leaf2, [0, 0.35, 0], [0.8, 0.7, 0.8]), ...flowers('#ffd54f', [[0.25, 0.25], [-0.2, 0.28], [0.05, -0.3], [-0.28, -0.05], [0.3, -0.1]], 0.5)],
  bunga_raya: () => [post('#4c8c3a', 0, 0, 0.5, 0.06), leafy(C.leaf, [0, 0.45, 0], [0.55, 0.4, 0.55]), ...flowers('#e0263a', [[0.18, 0.12], [-0.15, 0.15], [0, -0.2]], 0.62, 0.18), ball('#ffd54f', [0.18, 0.66, 0.12], [0.05, 0.05, 0.05])],
  orchid_pot: () => [['cylinder', m('#c97b4a'), [0, 0.15, 0], [0.4, 0.3, 0.4]], post('#4c8c3a', 0, 0, 0.75, 0.04), ...flowers('#b66be0', [[0.08, 0.05], [-0.08, 0.06], [0.02, -0.08]], 0.65, 0.13)],
  sunflower: () => [post('#4c8c3a', 0, 0, 0.9, 0.07), ['cylinder', m('#ffc93c'), [0, 0.95, 0.05], [0.5, 0.06, 0.5], [Math.PI / 2, 0, 0]], ['cylinder', m('#6b4423'), [0, 0.95, 0.09], [0.22, 0.04, 0.22], [Math.PI / 2, 0, 0]]],
  flowerbed_red: () => [box(C.wood, [0, 0.08, 0], [0.9, 0.16, 0.9]), box(C.soil, [0, 0.17, 0], [0.78, 0.04, 0.78]), ...flowers('#e8453c', [[-0.2, -0.2], [0.2, -0.2], [0, 0], [-0.2, 0.2], [0.2, 0.2]], 0.26)],
  flowerbed_yellow: () => [box(C.wood, [0, 0.08, 0], [0.9, 0.16, 0.9]), box(C.soil, [0, 0.17, 0], [0.78, 0.04, 0.78]), ...flowers('#ffd54f', [[-0.2, -0.2], [0.2, -0.2], [0, 0], [-0.2, 0.2], [0.2, 0.2]], 0.26)],
  flowerbed_purple: () => [box(C.wood, [0, 0.08, 0], [0.9, 0.16, 0.9]), box(C.soil, [0, 0.17, 0], [0.78, 0.04, 0.78]), ...flowers('#9c6ade', [[-0.2, -0.2], [0.2, -0.2], [0, 0], [-0.2, 0.2], [0.2, 0.2]], 0.26)],
  veg_patch: () => [
    box(C.soil, [0, 0.06, 0], [1.8, 0.12, 1.8]),
    ...[-0.55, 0, 0.55].flatMap((z) => [-0.55, 0, 0.55].map((x): Part => leafy(z === 0 ? '#7cc04a' : C.leaf, [x, 0.22, z], [0.3, 0.22, 0.3]))),
    ...[-0.55, 0.55].map((x): Part => ['cone', m('#f08a24'), [x, 0.18, 0.78], [0.12, 0.2, 0.12], [Math.PI, 0, 0]]),
  ],
  grass_tuft: () => [-0.15, 0, 0.15].map((x, i): Part => ['cone', leaf(i === 1 ? C.leaf2 : C.leaf), [x, 0.15, (i - 1) * 0.1], [0.14, 0.3, 0.14]]),

  // ---- Trees
  tree_coconut: () => [
    ['cylinder', m('#a07850'), [0.05, 0.6, 0], [0.16, 1.2, 0.16], [0, 0, -0.08]],
    ['cylinder', m('#a07850'), [0.12, 1.5, 0], [0.14, 0.7, 0.14], [0, 0, -0.15]],
    ...[0, 1.26, 2.52, 3.78, 5.04].map((a): Part => leafy(C.leaf, [0.1 + Math.cos(a) * 0.2, 1.85, Math.sin(a) * 0.2], [0.55, 0.1, 0.22])),
    ...[[0.05, 0.08], [0.25, -0.05], [0.12, -0.15]].map(([x, z]): Part => ball('#6b4a2b', [x, 1.75, z], [0.12, 0.12, 0.12])),
  ],
  tree_durian: () => [post(C.dark, 0, 0, 1.0, 0.18), leafy('#4e9a39', [0, 1.3, 0], [0.95, 0.8, 0.95]), ...[[0.3, 0.3], [-0.32, 0.2], [0.1, -0.35]].map(([x, z]): Part => ['octa', m('#9bbf3a'), [x, 0.95, z], [0.2, 0.24, 0.2]])],
  tree_rambutan: () => [post(C.dark, 0, 0, 0.9, 0.17), leafy(C.leaf, [0, 1.2, 0], [0.9, 0.8, 0.9]), ...flowers('#e0263a', [[0.35, 0.25], [-0.3, 0.3], [0.2, -0.35], [-0.35, -0.15]], 1.05, 0.11)],
  tree_banana: () => [
    post('#8fa64a', 0, 0, 1.0, 0.16),
    ...[0, 1.57, 3.14, 4.71].map((a): Part => box(C.leaf2, [Math.cos(a) * 0.28, 1.15, Math.sin(a) * 0.28], [0.6, 0.03, 0.22], [0, -a, 0.4])),
    ball('#f2d23c', [0.12, 0.85, 0.12], [0.18, 0.28, 0.18]),
  ],
  tree_frangipani: () => [post(C.dark, 0, 0, 0.8, 0.15), leafy('#6aa84f', [0, 1.05, 0], [0.85, 0.6, 0.85]), ...flowers(C.white, [[0.3, 0.2], [-0.25, 0.3], [0.05, -0.32], [-0.3, -0.1], [0.28, -0.2]], 1.25, 0.13)],
  bamboo_clump: () => [[-0.2, -0.15, 1.6], [0.15, -0.2, 1.9], [0.0, 0.2, 1.75], [0.25, 0.15, 1.4]].map(([x, z, h]): Part => post('#7fb24a', x, z, h, 0.09)),
  tree_pine: () => [post(C.dark, 0, 0, 0.5, 0.14), ['cone', leaf('#3f7d3a'), [0, 0.8, 0], [0.9, 0.7, 0.9]], ['cone', leaf('#4b8c43'), [0, 1.25, 0], [0.7, 0.6, 0.7]], ['cone', leaf('#5aa04d'), [0, 1.65, 0], [0.45, 0.5, 0.45]]],

  // ---- Paths and fences
  path_dirt: () => [box('#b98b5a', [0, 0.02, 0], [0.98, 0.04, 0.98])],
  path_stones: () => [[-0.22, -0.2], [0.22, 0.05], [-0.1, 0.28]].map(([x, z]): Part => ['cylinder', m(C.stone), [x, 0.03, z], [0.36, 0.06, 0.3]]),
  path_boardwalk: () => [-0.33, 0, 0.33].map((z): Part => box(C.light, [0, 0.05, z], [0.96, 0.08, 0.28])),
  fence_wood: () => [post(C.wood, -0.4, 0, 0.7, 0.1), post(C.wood, 0.4, 0, 0.7, 0.1), box(C.wood, [0, 0.5, 0], [0.96, 0.08, 0.06]), box(C.wood, [0, 0.25, 0], [0.96, 0.08, 0.06])],
  fence_bamboo: () => [-0.4, -0.2, 0, 0.2, 0.4].map((x): Part => post('#a8b84a', x, 0, 0.7 + (x === 0 ? 0.08 : 0), 0.08)),
  fence_picket: () => [...[-0.36, -0.12, 0.12, 0.36].map((x): Part => box(C.white, [x, 0.33, 0], [0.12, 0.66, 0.05])), box(C.white, [0, 0.4, -0.03], [0.96, 0.07, 0.04])],
  gate_wood: () => [post(C.dark, -0.44, 0, 0.9, 0.1), post(C.dark, 0.44, 0, 0.9, 0.1), box(C.wood, [0, 0.5, 0], [0.76, 0.5, 0.05]), box(C.dark, [0, 0.5, 0.01], [0.76, 0.06, 0.05], [0, 0, 0.55])],

  // ---- Lights
  pelita: () => [post(C.dark, 0, 0, 0.7, 0.05), ['cylinder', m('#c97b4a'), [0, 0.74, 0], [0.16, 0.1, 0.16]], ['cone', glow('#ffb347'), [0, 0.86, 0], [0.08, 0.16, 0.08]]],
  lantern_hanging: () => [post(C.dark, -0.3, 0, 1.4, 0.08), box(C.dark, [-0.05, 1.38, 0], [0.55, 0.06, 0.06]), box(C.dark, [0.15, 1.25, 0], [0.02, 0.2, 0.02]), ['sphere', glow('#ff6b5a'), [0.15, 1.05, 0], [0.25, 0.32, 0.25]]],
  lamp_post: () => [post('#3d3d46', 0, 0, 1.8, 0.1), box('#3d3d46', [0, 1.82, 0], [0.32, 0.06, 0.32]), ['sphere', glow('#fff1a8'), [0, 1.98, 0], [0.26, 0.26, 0.26]], ['cylinder', m('#3d3d46'), [0, 0.05, 0], [0.3, 0.1, 0.3]]],
  campfire: () => [
    ...[0, 1.05, 2.1, 3.15, 4.2, 5.25].map((a): Part => ball(C.stoneDark, [Math.cos(a) * 0.36, 0.08, Math.sin(a) * 0.36], [0.18, 0.14, 0.18])),
    box(C.dark, [0, 0.1, 0], [0.55, 0.1, 0.1], [0, 0.6, 0]),
    box(C.dark, [0, 0.1, 0], [0.55, 0.1, 0.1], [0, -0.6, 0]),
    ['cone', glow('#ff8a1f'), [0, 0.32, 0], [0.3, 0.45, 0.3]],
    ['cone', glow('#ffd54f'), [0, 0.28, 0], [0.16, 0.3, 0.16]],
  ],
  light_arch: () => [
    post(C.wood, -0.85, 0, 1.6, 0.1), post(C.wood, 0.85, 0, 1.6, 0.1),
    box(C.wood, [0, 1.62, 0], [1.9, 0.1, 0.1]),
    ...[-0.6, -0.3, 0, 0.3, 0.6].map((x, i): Part => ['sphere', glow(['#ff6b5a', '#ffd54f', '#7cd67a', '#6ec6ff', '#c58cff'][i]), [x, 1.5, 0], [0.1, 0.1, 0.1]]),
  ],

  // ---- Furniture
  bench: () => [box(C.wood, [0, 0.38, 0], [0.9, 0.08, 0.36]), box(C.wood, [0, 0.62, -0.15], [0.9, 0.3, 0.06]), ...[-0.38, 0.38].map((x): Part => box(C.dark, [x, 0.17, 0], [0.08, 0.34, 0.32]))],
  table_set: () => [
    post(C.dark, 0, 0, 0.6, 0.12), ['cylinder', m(C.wood), [0, 0.62, 0], [1.0, 0.07, 1.0]],
    ...[[0, -0.75], [0, 0.75], [-0.75, 0], [0.75, 0]].map(([x, z]): Part => ['cylinder', m(C.light), [x, 0.22, z], [0.32, 0.44, 0.32]]),
  ],
  hammock: () => [post(C.dark, -0.85, 0, 1.0, 0.09), post(C.dark, 0.85, 0, 1.0, 0.09), box('#e0623a', [0, 0.5, 0], [1.5, 0.06, 0.45], [0, 0, 0]), box('#f2b872', [0, 0.53, 0], [1.3, 0.03, 0.42])],
  swing: () => [post(C.dark, -0.42, 0, 1.4, 0.08), post(C.dark, 0.42, 0, 1.4, 0.08), box(C.dark, [0, 1.4, 0], [0.96, 0.08, 0.08]), box('#ccc', [-0.18, 0.95, 0], [0.02, 0.85, 0.02]), box('#ccc', [0.18, 0.95, 0], [0.02, 0.85, 0.02]), box(C.wood, [0, 0.52, 0], [0.5, 0.06, 0.25])],
  picnic_mat: () => [...[-0.45, 0.45].flatMap((x) => [-0.45, 0.45].map((z): Part => box((x > 0) === (z > 0) ? '#e8453c' : C.white, [x, 0.02, z], [0.9, 0.03, 0.9]))), ['cylinder', m('#c9a27a'), [0.3, 0.12, -0.3], [0.35, 0.2, 0.35]]],
  mailbox: () => [post(C.dark, 0, 0, 0.75, 0.06), box('#d64541', [0, 0.85, 0], [0.32, 0.28, 0.45]), box('#ffd54f', [0.17, 0.95, -0.05], [0.02, 0.18, 0.06])],
  pet_bed: () => [['cylinder', m('#7aa7d9'), [0, 0.08, 0], [0.85, 0.16, 0.85]], ['cylinder', m('#fff3d6'), [0, 0.13, 0], [0.62, 0.1, 0.62]], ball('#ffd54f', [0.22, 0.2, 0.15], [0.12, 0.12, 0.12])],
  scarecrow: () => [post(C.dark, 0, 0, 1.3, 0.07), box(C.dark, [0, 1.0, 0], [0.8, 0.06, 0.06]), box('#5b8fd6', [0, 0.95, 0], [0.42, 0.42, 0.2]), ball('#e9d29a', [0, 1.35, 0], [0.3, 0.3, 0.3]), ['cone', m(C.thatch), [0, 1.55, 0], [0.48, 0.2, 0.48]]],

  // ---- Malaysian
  wau_stand: () => [
    post(C.dark, 0, -0.2, 1.4, 0.06),
    box('#e8453c', [0, 1.35, -0.15], [0.55, 0.55, 0.03], [0, 0, Math.PI / 4]),
    box('#ffd54f', [0, 1.35, -0.13], [0.3, 0.3, 0.03], [0, 0, Math.PI / 4]),
    box('#3f9fd6', [0, 1.0, -0.15], [0.7, 0.14, 0.03]),
    box('#3f9fd6', [0, 0.82, -0.15], [0.3, 0.14, 0.03]),
  ],
  sampan: () => [
    box(C.wood, [0, 0.18, 0], [1.4, 0.26, 0.6]),
    box(C.wood, [-0.82, 0.24, 0], [0.32, 0.3, 0.42], [0, 0, 0.35]),
    box(C.wood, [0.82, 0.24, 0], [0.32, 0.3, 0.42], [0, 0, -0.35]),
    box(C.light, [0, 0.33, 0], [1.2, 0.04, 0.48]),
    box(C.dark, [0.2, 0.36, 0], [0.12, 0.04, 0.55]),
  ],
  kampung_gate: () => [
    post(C.dark, -1.3, 0, 1.9, 0.14), post(C.dark, 1.3, 0, 1.9, 0.14),
    box(C.wood, [0, 1.9, 0], [2.95, 0.16, 0.3]),
    box(C.roof, [-0.65, 2.15, 0], [1.6, 0.08, 0.55], [0, 0, 0.3]),
    box(C.roof, [0.65, 2.15, 0], [1.6, 0.08, 0.55], [0, 0, -0.3]),
    box('#ffd54f', [0, 1.72, 0.16], [0.9, 0.18, 0.03]),
  ],
  congkak_table: () => [
    box(C.wood, [0, 0.42, 0], [0.9, 0.16, 0.36]),
    ...[-0.38, 0.38].map((x): Part => box(C.dark, [x, 0.17, 0], [0.08, 0.34, 0.3])),
    ...[-0.25, -0.1, 0.05, 0.2].flatMap((x) => [-0.07, 0.07].map((z): Part => ball('#3d2a1a', [x, 0.5, z], [0.07, 0.04, 0.07]))),
  ],

  // ---- Water
  pond: () => [['cylinder', m(C.stone), [0, 0.06, 0], [1.85, 0.12, 1.85]], ['cylinder', glow(C.water), [0, 0.1, 0], [1.55, 0.06, 1.55]], ...[[0.4, 0.3], [-0.35, -0.2]].map(([x, z]): Part => ['cylinder', m('#5aa83c'), [x, 0.14, z], [0.3, 0.02, 0.3]]), ball('#ff8fc7', [0.4, 0.17, 0.3], [0.1, 0.08, 0.1])],
  fountain: () => [['cylinder', m(C.white), [0, 0.15, 0], [1.85, 0.3, 1.85]], ['cylinder', glow(C.water), [0, 0.28, 0], [1.6, 0.06, 1.6]], ['cylinder', m(C.white), [0, 0.65, 0], [0.25, 0.8, 0.25]], ['cylinder', m(C.white), [0, 1.05, 0], [0.7, 0.1, 0.7]], ['cone', glow('#bfe6ff'), [0, 1.25, 0], [0.35, 0.35, 0.35]]],
  well: () => [['cylinder', m(C.stone), [0, 0.3, 0], [0.8, 0.6, 0.8]], ['cylinder', m('#2f5f86'), [0, 0.58, 0], [0.62, 0.04, 0.62]], post(C.dark, -0.35, 0, 1.3, 0.06), post(C.dark, 0.35, 0, 1.3, 0.06), ['cone', m(C.roof), [0, 1.45, 0], [0.95, 0.4, 0.95]]],
  bridge_small: () => [
    ...[-0.7, -0.35, 0, 0.35, 0.7].map((x): Part => box(C.light, [x, 0.12 + (0.7 - Math.abs(x)) * 0.25, 0], [0.33, 0.08, 0.8])),
    box(C.dark, [0, 0.45, 0.38], [1.7, 0.06, 0.05]),
    box(C.dark, [0, 0.45, -0.38], [1.7, 0.06, 0.05]),
  ],
}

export const islandModelIds = () => Object.keys(MODELS)
/** Raw parts (for the size test). */
export const islandRawParts = (id: string): Part[] => (MODELS[id] ?? MODELS.bush_round)()

const cache = new Map<string, ModelPart[]>()
export function islandParts(id: string): ModelPart[] {
  let p = cache.get(id)
  if (!p) cache.set(id, (p = toParts(islandRawParts(id))))
  return p
}

/** One item as a plain group (thumbnails, the placement ghost). */
export function buildIslandItem(id: string): Group {
  const g = new Group()
  for (const p of islandParts(id)) {
    const mesh = new Mesh(p.geometry, p.material)
    mesh.applyMatrix4(p.local)
    g.add(mesh)
  }
  return g
}
export { geometry }
