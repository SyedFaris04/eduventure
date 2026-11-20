import { Group, Mesh, MeshStandardMaterial } from 'three'
import type { PetForm, PetLook, PetSpecies, PetStage } from '../../features/pet/petRules'
import { faceMaterial, geometry, material } from '../hero/materials'
import type { Shape } from '../hero/parts'

type V3 = [number, number, number]
type Part = [shape: Shape, colour: string, at: V3, size: V3, rot?: V3]
const PI = Math.PI
const BODY = 'body' // replaced by the species colour, or the dye

/** How big each stage stands in the world (the model itself is ~0.9 units tall). */
export const PET_SCALE: Record<PetStage, number> = { baby: 0.45, young: 0.6, adult: 0.75 }

export const FORM_COLOUR: Record<PetForm, string> = { science: '#4fc3f7', maths: '#ffb74d', technology: '#7c4dff', language: '#e57373', seimbang: '#ffd54f' }
const DYES: Record<string, string> = { pet_dye_ocean: '#4fa3d9', pet_dye_rose: '#e88fb4', pet_dye_gold: '#f2c14e', pet_dye_forest: '#4f9a3a' }

type Design = { colour: string; head: V3; neck: V3; baby: Part[]; young: Part[]; adult: (c: string) => Part[] }
const eyes = (y: number, z: number, w = 0.3): Part => ['eyes:round', '', [0, y, z], [w, w * 0.42, 1]]
const mouth = (y: number, z: number, w = 0.14): Part => ['mouth:smile', '', [0, y, z], [w, w * 0.5, 1]]
const pair = (f: (s: 1 | -1) => Part): Part[] => [f(1), f(-1)]

const DESIGNS: Record<PetSpecies, Design> = {
  // Kancil: a slim mouse-deer with big ears and thin legs.
  kancil: {
    colour: '#b07a4a',
    head: [0, 0.9, 0.26],
    neck: [0, 0.58, 0.2],
    baby: [
      ['sphere', BODY, [0, 0.4, -0.05], [0.42, 0.38, 0.62]],
      ['sphere', '#f4e3c8', [0, 0.36, 0.06], [0.3, 0.26, 0.4]],
      ['sphere', BODY, [0, 0.72, 0.24], [0.36, 0.34, 0.38]],
      ['cone', '#8a5a33', [0, 0.66, 0.46], [0.12, 0.14, 0.12], [PI / 2, 0, 0]],
      ...pair((s) => ['capsule', BODY, [s * 0.12, 0.92, 0.2], [0.08, 0.16, 0.05], [0, 0, s * -0.3]]),
      ...([[0.12, 0.16], [-0.12, 0.16], [0.12, -0.24], [-0.12, -0.24]] as const).map(([x, z]): Part => ['cylinder', '#8a5a33', [x, 0.12, z], [0.05, 0.24, 0.05]]),
      eyes(0.76, 0.42),
      mouth(0.62, 0.42),
    ],
    young: [
      ...pair((s) => ['capsule', '#f4e3c8', [s * 0.13, 0.96, 0.21], [0.05, 0.12, 0.03], [0, 0, s * -0.3]]),
      ...([[-0.1, 0.5, -0.2], [0.12, 0.52, -0.05], [-0.06, 0.55, 0.1]] as V3[]).map((at): Part => ['sphere', '#f4e3c8', at, [0.06, 0.04, 0.06]]),
      ['cone', BODY, [0, 0.42, -0.4], [0.07, 0.14, 0.07], [-PI / 2 - 0.4, 0, 0]],
    ],
    adult: (c) => [
      ['octa', c, [0, 1.02, 0.24], [0.08, 0.12, 0.08]],
      ['sphere', '*' + c, [0, 0.5, 0.28], [0.08, 0.08, 0.05]],
    ],
  },
  // Beruang: a round little sun bear with a golden chest crescent.
  beruang: {
    colour: '#3a312b',
    head: [0, 1.0, 0.08],
    neck: [0, 0.62, 0.06],
    baby: [
      ['sphere', BODY, [0, 0.36, 0], [0.62, 0.6, 0.58]],
      ['dome', '#f2c46d', [0, 0.44, 0.24], [0.3, 0.14, 0.1], [PI / 2, 0, 0]],
      ['sphere', BODY, [0, 0.8, 0.08], [0.5, 0.46, 0.46]],
      ['sphere', '#d9b48a', [0, 0.74, 0.3], [0.22, 0.16, 0.14]],
      ['sphere', '#2b2b2b', [0, 0.78, 0.37], [0.07, 0.05, 0.05]],
      ...pair((s) => ['sphere', BODY, [s * 0.2, 1.0, 0.04], [0.14, 0.14, 0.08]]),
      ...pair((s) => ['capsule', BODY, [s * 0.18, 0.08, 0.06], [0.16, 0.14, 0.18]]),
      eyes(0.88, 0.3),
      mouth(0.68, 0.36),
    ],
    young: [
      ...[-0.08, 0, 0.08].flatMap((x): Part[] => pair((s) => ['cone', '#f4f1ea', [s * 0.18 + x, 0.04, 0.2], [0.03, 0.06, 0.03], [PI / 2, 0, 0]])),
      ...pair((s) => ['capsule', BODY, [s * 0.32, 0.4, 0.08], [0.12, 0.2, 0.12], [0, 0, s * 0.4]]),
    ],
    adult: (c) => [
      ['octa', c, [0, 1.12, 0.06], [0.09, 0.12, 0.09]],
      ['sphere', '*' + c, [0, 0.46, 0.32], [0.08, 0.08, 0.05]],
    ],
  },
  // Naga: a small green dragon-serpent with nub horns and a curled tail.
  naga: {
    colour: '#5fbf6a',
    head: [0, 0.96, 0.16],
    neck: [0, 0.58, 0.12],
    baby: [
      ['sphere', BODY, [0, 0.34, 0], [0.5, 0.5, 0.56]],
      ['sphere', '#f2e3a0', [0, 0.32, 0.14], [0.32, 0.36, 0.3]],
      ['sphere', BODY, [0, 0.76, 0.16], [0.44, 0.4, 0.44]],
      ['sphere', BODY, [0, 0.7, 0.38], [0.26, 0.18, 0.2]],
      ...pair((s) => ['cone', '#f2e3a0', [s * 0.12, 0.98, 0.1], [0.06, 0.14, 0.06], [-0.3, 0, s * -0.3]]),
      ['cone', BODY, [0, 0.2, -0.42], [0.14, 0.4, 0.14], [-PI / 2 - 0.5, 0, 0]],
      ...pair((s) => ['capsule', BODY, [s * 0.16, 0.07, 0.06], [0.13, 0.12, 0.16]]),
      eyes(0.84, 0.36),
      mouth(0.66, 0.46),
    ],
    young: [
      ...pair((s) => ['flare', '#4aa357', [s * 0.3, 0.52, -0.08], [0.18, 0.06, 0.24], [0, s * 0.4, s * 0.6]]),
      ...([0.62, 0.46, 0.3] as const).map((y, i): Part => ['cone', '#4aa357', [0, y + 0.1, -0.2 - i * 0.05], [0.06, 0.1, 0.06], [-0.5 - i * 0.3, 0, 0]]),
    ],
    adult: (c) => [
      ['octa', c, [0, 1.06, 0.14], [0.08, 0.12, 0.08]],
      ['sphere', '*' + c, [0, 0.12, -0.6], [0.08, 0.08, 0.08]],
      ['sphere', '*' + c, [0, 0.42, 0.29], [0.07, 0.07, 0.04]],
    ],
  },
}

const HATS: Record<string, Part[]> = {
  pet_songkok: [['cylinder', '#2b2b2b', [0, 0, 0], [0.26, 0.12, 0.2]]],
  pet_flower: [
    ...[0, 1, 2, 3, 4].map((i): Part => ['sphere', '#f48fb1', [Math.cos((i * 2 * PI) / 5) * 0.07, 0.02, Math.sin((i * 2 * PI) / 5) * 0.07], [0.07, 0.04, 0.07]]),
    ['sphere', '#ffd54f', [0, 0.04, 0], [0.06, 0.04, 0.06]],
  ],
  pet_leaf_hat: [
    ['sphere', '#5aa83c', [0, 0.02, 0], [0.3, 0.04, 0.22]],
    ['cylinder', '#3f7a2a', [0, 0.07, 0], [0.02, 0.1, 0.02]],
  ],
  pet_tengkolok: [
    ['cylinder', '#b03a2e', [0, 0, 0], [0.28, 0.1, 0.22]],
    ['cone', '#b03a2e', [0.06, 0.1, 0], [0.12, 0.16, 0.1], [0, 0, -0.5]],
    ['cylinder', '#f2c14e', [0, -0.04, 0], [0.285, 0.03, 0.225]],
  ],
}
const NECKS: Record<string, Part[]> = {
  pet_crystal_collar: [
    ['cylinder', '#6f7680', [0, 0, 0], [0.32, 0.05, 0.28]],
    ['octa', '#6fd0ff', [0, -0.07, 0.15], [0.06, 0.1, 0.06]],
  ],
  pet_batik: [
    ['cylinder', '#7e57c2', [0, 0, 0], [0.34, 0.06, 0.3]],
    ['cone', '#7e57c2', [0, -0.08, 0.14], [0.1, 0.14, 0.04], [PI, 0, 0]],
    ...[-0.1, 0, 0.1].map((x): Part => ['sphere', '#ffd54f', [x, 0, 0.15], [0.03, 0.03, 0.02]]),
  ],
  pet_bell: [
    ['cylinder', '#d32f2f', [0, 0, 0], [0.32, 0.05, 0.28]],
    ['sphere', '#f2c14e', [0, -0.06, 0.15], [0.07, 0.07, 0.07]],
  ],
}

const glows = new Map<string, MeshStandardMaterial>()
const glow = (c: string) => {
  let m = glows.get(c)
  if (!m) glows.set(c, (m = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.85, roughness: 0.4 })))
  return m
}

function add(g: Group, parts: Part[], body: string, offset: V3 = [0, 0, 0]) {
  for (const [shape, colour, at, size, rot] of parts) {
    const face = shape.startsWith('eyes:') || shape.startsWith('mouth:')
    const c = colour === BODY ? body : colour
    const m = new Mesh(geometry(shape), face ? faceMaterial(shape as `eyes:${string}`) : c.startsWith('*') ? glow(c.slice(1)) : material(c))
    m.position.set(at[0] + offset[0], at[1] + offset[1], at[2] + offset[2])
    m.scale.set(...size)
    if (rot) m.rotation.set(...rot)
    m.castShadow = !face
    g.add(m)
  }
}

/** The knowledge pet, built in code like the monsters: feet on y = 0, facing +z. */
export function buildPet(species: PetSpecies, stage: PetStage, form: PetForm | null, look: PetLook): Group {
  const d = DESIGNS[species]
  const body = (look.dye && DYES[look.dye]) || d.colour
  const g = new Group()
  add(g, d.baby, body)
  if (stage !== 'baby') add(g, d.young, body)
  if (stage === 'adult' && form) add(g, d.adult(FORM_COLOUR[form]), body)
  if (look.hat && HATS[look.hat]) add(g, HATS[look.hat], body, d.head)
  if (look.neck && NECKS[look.neck]) add(g, NECKS[look.neck], body, d.neck)
  return g
}
