import { Group, Mesh, MeshStandardMaterial } from 'three'
import type { PropKind } from '../../game/map'
import { geometry, material } from '../hero/materials'
import type { Shape } from '../hero/parts'
import { addWind } from '../wind'

/** Props built from simple shapes in code (no CC0 pack has these in our style). Swap any for a model later. */
export const CODE_PROP_KINDS = ['palm', 'kampung_house', 'stall', 'fern', 'mangrove', 'mushroom', 'pine_snow', 'pillar', 'sundial', 'abacus_gate'] as const satisfies readonly PropKind[]
export type CodePropKind = (typeof CODE_PROP_KINDS)[number]
export const isCodeProp = (k: PropKind): k is CodePropKind => (CODE_PROP_KINDS as readonly string[]).includes(k)

type V3 = [number, number, number]
/** shape, material, centre, size, rotation (Euler XYZ). */
type Part = [Shape, MeshStandardMaterial, V3, V3, V3?]

const leaves = new Map<string, MeshStandardMaterial>()
/** Leaf material that sways in the wind; shared per colour. */
const leaf = (colour: string) => {
  let m = leaves.get(colour)
  if (!m) leaves.set(colour, (m = addWind(new MeshStandardMaterial({ color: colour, roughness: 0.85 }), 0.12)))
  return m
}
const glows = new Map<string, MeshStandardMaterial>()
/** Lantern glass: lit from inside, so it reads at dusk without extra lights. */
const glow = (colour: string) => {
  let m = glows.get(colour)
  if (!m) glows.set(colour, (m = new MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.9, roughness: 0.5 })))
  return m
}
const m = material

const ring = (n: number, f: (i: number, a: number) => Part) => Array.from({ length: n }, (_, i) => f(i, (i / n) * Math.PI * 2))

const DESIGNS: Record<CodePropKind, () => Part[]> = {
  // Coconut palm: a gently leaning trunk, drooping fronds and a few coconuts.
  palm: () => [
    ['cylinder', m('#9c7a54'), [0, 0.6, 0], [0.24, 1.2, 0.24]],
    ['cylinder', m('#8d6c49'), [0.06, 1.7, 0], [0.2, 1.05, 0.2], [0, 0, -0.08]],
    ['sphere', m('#6b4a2e'), [0.1, 2.28, 0.08], [0.17, 0.17, 0.17]],
    ['sphere', m('#6b4a2e'), [-0.02, 2.26, -0.1], [0.16, 0.16, 0.16]],
    ...ring(6, (_, a) => ['box', leaf('#4f9a3a'), [Math.cos(a) * 0.36, 2.36, Math.sin(a) * 0.36], [0.78, 0.05, 0.26], [0, -a, -0.38]] as Part),
    ['sphere', leaf('#5fae45'), [0.08, 2.42, 0], [0.34, 0.16, 0.34]],
  ],
  // Rumah kampung: a wooden house on stilts with a steep roof and front steps (2 × 2 tiles).
  kampung_house: () => [
    ...([[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]] as const).map(([x, z]) => ['cylinder', m('#6b4a2e'), [x, 0.32, z], [0.13, 0.64, 0.13]] as Part),
    ['box', m('#a0703f'), [0, 0.68, 0], [1.9, 0.1, 1.55]],
    ['box', m('#d9b27c'), [0, 1.17, 0], [1.7, 0.88, 1.35]],
    ['box', m('#7a4f2a'), [0, 1.03, 0.69], [0.36, 0.62, 0.04]],
    ['box', m('#5a3a22'), [-0.55, 1.26, 0.69], [0.3, 0.28, 0.04]],
    ['box', m('#5a3a22'), [0.55, 1.26, 0.69], [0.3, 0.28, 0.04]],
    ['box', m('#8e3b2e'), [0, 1.84, 0.37], [1.98, 0.08, 0.98], [0.62, 0, 0]],
    ['box', m('#8e3b2e'), [0, 1.84, -0.37], [1.98, 0.08, 0.98], [-0.62, 0, 0]],
    ['box', m('#6e2c22'), [0, 2.12, 0], [2.0, 0.08, 0.12]],
    ['box', m('#8b5e34'), [0, 0.5, 0.88], [0.42, 0.06, 0.2]],
    ['box', m('#8b5e34'), [0, 0.32, 0.98], [0.42, 0.06, 0.2]],
    ['box', m('#8b5e34'), [0, 0.14, 1.06], [0.42, 0.06, 0.2]],
  ],
  // Pasar malam stall: a table of fruit under a striped canopy, with two glowing lanterns.
  stall: () => [
    ...([[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]] as const).map(([x, z]) => ['cylinder', m('#7a4f2a'), [x, 0.3, z], [0.06, 0.6, 0.06]] as Part),
    ['box', m('#a0612f'), [0, 0.63, 0], [1.0, 0.07, 0.58]],
    ['cylinder', m('#7a4f2a'), [-0.46, 0.78, -0.28], [0.06, 1.55, 0.06]],
    ['cylinder', m('#7a4f2a'), [0.46, 0.78, -0.28], [0.06, 1.55, 0.06]],
    ['box', m('#d94f3d'), [0, 1.5, 0.02], [1.14, 0.06, 0.82], [0.18, 0, 0]],
    ['box', m('#fff6e3'), [0, 1.52, 0.02], [0.3, 0.07, 0.83], [0.18, 0, 0]],
    ['sphere', m('#e8473a'), [-0.25, 0.71, 0.05], [0.14, 0.14, 0.14]],
    ['sphere', m('#f2a33a'), [-0.08, 0.71, -0.05], [0.14, 0.14, 0.14]],
    ['sphere', m('#7cb342'), [0.12, 0.71, 0.06], [0.16, 0.14, 0.16]],
    ['sphere', m('#e8473a'), [0.3, 0.71, -0.04], [0.13, 0.13, 0.13]],
    ['sphere', glow('#ff8a3d'), [-0.5, 1.18, 0.36], [0.16, 0.2, 0.16]],
    ['sphere', glow('#ffcf4d'), [0.5, 1.18, 0.36], [0.16, 0.2, 0.16]],
  ],
  // Rainforest fern: blades fanning out and up.
  fern: () => [...ring(7, (i, a) => ['box', leaf(i % 2 ? '#3f8f3a' : '#4fa244'), [Math.cos(a) * 0.24, 0.2, Math.sin(a) * 0.24], [0.56, 0.03, 0.16], [0, -a, 0.55]] as Part)],
  // Mangrove: arching stilt roots, a short trunk and a wide canopy.
  mangrove: () => [
    ...ring(3, (_, a) => ['arc', m('#6e5a3e'), [0, 0, 0], [0.9, 0.9, 0.9], [0, a, 0]] as Part),
    ['cylinder', m('#6e5a3e'), [0, 0.8, 0], [0.16, 1.1, 0.16]],
    ['sphere', leaf('#3d7a3a'), [0, 1.6, 0], [1.25, 0.72, 1.15]],
    ['sphere', leaf('#4b8c40'), [0.3, 1.86, 0.1], [0.8, 0.5, 0.8]],
  ],
  // Giant rainforest mushrooms, one big and one small.
  mushroom: () => [
    ['cylinder', m('#f1e6cf'), [0, 0.25, 0], [0.22, 0.5, 0.22]],
    ['dome', m('#d9573f'), [0, 0.46, 0], [0.72, 0.32, 0.72]],
    ['sphere', m('#fff6e3'), [0.16, 0.7, 0.1], [0.09, 0.05, 0.09]],
    ['sphere', m('#fff6e3'), [-0.12, 0.72, -0.08], [0.08, 0.05, 0.08]],
    ['cylinder', m('#f1e6cf'), [0.3, 0.14, 0.18], [0.12, 0.28, 0.12]],
    ['dome', m('#e8a23a'), [0.3, 0.26, 0.18], [0.38, 0.18, 0.38]],
  ],
  // Snowy pine: stacked cones with snow on each tier.
  pine_snow: () => [
    ['cylinder', m('#6b4a2e'), [0, 0.25, 0], [0.16, 0.5, 0.16]],
    ['cone', leaf('#2f6b4a'), [0, 0.88, 0], [1.1, 0.9, 1.1]],
    ['cone', leaf('#357553'), [0, 1.38, 0], [0.86, 0.8, 0.86]],
    ['cone', leaf('#3b7f5b'), [0, 1.86, 0], [0.58, 0.72, 0.58]],
    ['cone', m('#f4f8fb'), [0, 1.08, 0], [0.62, 0.36, 0.62]],
    ['cone', m('#f4f8fb'), [0, 1.56, 0], [0.48, 0.32, 0.48]],
    ['cone', m('#f4f8fb'), [0, 2.12, 0], [0.32, 0.3, 0.32]],
  ],
  // Ancient stone pillar.
  pillar: () => [
    ['box', m('#cfc6b4'), [0, 0.09, 0], [0.76, 0.18, 0.76]],
    ['cylinder', m('#e2dccd'), [0, 0.98, 0], [0.46, 1.6, 0.46]],
    ['box', m('#cfc6b4'), [0, 1.86, 0], [0.7, 0.16, 0.7]],
  ],
  // Sundial on a round plinth.
  sundial: () => [
    ['cylinder', m('#bdb5a3'), [0, 0.15, 0], [0.8, 0.3, 0.8]],
    ['cylinder', m('#e8e2d2'), [0, 0.32, 0], [0.7, 0.05, 0.7]],
    ['box', m('#7a6a4f'), [0, 0.45, -0.04], [0.05, 0.26, 0.34], [0.55, 0, 0]],
    ...ring(8, (_, a) => ['box', m('#7a6a4f'), [Math.cos(a) * 0.28, 0.35, Math.sin(a) * 0.28], [0.06, 0.02, 0.02], [0, -a, 0]] as Part),
  ],
  // Abacus gate at the summit: two stone posts, a lintel and rods of coloured beads (spans 3 tiles).
  abacus_gate: () => {
    const beads = ['#e85a4f', '#f2c14e', '#4fa3d9', '#6fbf5f']
    return [
      ['box', m('#a89a82'), [-1.05, 1.1, 0], [0.4, 2.2, 0.42]],
      ['box', m('#a89a82'), [1.05, 1.1, 0], [0.4, 2.2, 0.42]],
      ['box', m('#8a7a60'), [0, 2.32, 0], [2.6, 0.28, 0.46]],
      ...[1.6, 1.85, 2.08].flatMap((y, r) => [
        ['cylinder', m('#5a4a36'), [0, y, 0], [0.05, 1.7, 0.05], [0, 0, Math.PI / 2]] as Part,
        ...Array.from({ length: 5 }, (_, i) => ['sphere', m(beads[(i + r) % 4]), [-0.6 + i * 0.3 + (r % 2) * 0.1, y, 0], [0.2, 0.17, 0.2]] as Part),
      ]),
    ]
  },
}

/** A fresh group for one prop; meshes share geometry and materials with every other copy. */
export function buildCodeProp(kind: CodePropKind): Group {
  const g = new Group()
  g.name = kind
  for (const [shape, mat, at, size, rot] of DESIGNS[kind]()) {
    const mesh = new Mesh(geometry(shape), mat)
    mesh.position.set(...at)
    mesh.scale.set(...size)
    if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = true
    mesh.receiveShadow = true
    g.add(mesh)
  }
  return g
}
