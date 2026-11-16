import { Group, Mesh, MeshStandardMaterial } from 'three'
import type { MonsterKind } from '../../game/map'
import { faceMaterial, geometry, material } from '../hero/materials'
import type { Shape } from '../hero/parts'

export const MONSTER_KINDS: MonsterKind[] = ['sproutling', 'pebblewing', 'dinobud']
type V3 = [number, number, number]
type Part = [shape: Shape, colour: string, at: V3, size: V3, rot?: V3]

const PI = Math.PI
const eyes = (y: number, z: number, w = 0.5): Part => ['eyes:round', '', [0, y, z], [w, w * 0.42, 1]]
const mouth = (y: number, z: number, w = 0.26): Part => ['mouth:smile', '', [0, y, z], [w, w * 0.5, 1]]

/** Original Greenhaven monsters in the chunky KayKit style, one world unit ≈ one tile. Feet on y = 0, facing +z. */
const DESIGNS: Record<MonsterKind | 'guardian', Part[]> = {
  // A leafy slime with a sprout on its head.
  sproutling: [
    ['sphere', '#9ccc65', [0, 0.32, 0], [0.82, 0.66, 0.78]],
    ['sphere', '#c5e1a5', [-0.16, 0.42, 0.22], [0.2, 0.26, 0.12]],
    ['cylinder', '#5e8c31', [0, 0.72, 0], [0.04, 0.16, 0.04]],
    ['sphere', '#5e9c35', [-0.13, 0.82, 0], [0.26, 0.08, 0.14], [0, 0, 0.5]],
    ['sphere', '#6fae4a', [0.13, 0.84, 0], [0.26, 0.08, 0.14], [0, 0, -0.5]],
    eyes(0.4, 0.385),
    mouth(0.24, 0.37),
  ],
  // A round pebble bird with stubby wings.
  pebblewing: [
    ['sphere', '#a3b1c2', [0, 0.46, 0], [0.76, 0.7, 0.7]],
    ['sphere', '#d7dee6', [0, 0.38, 0.17], [0.46, 0.42, 0.4]],
    ...([1, -1] as const).map((s): Part => ['sphere', '#8796a8', [s * 0.4, 0.5, -0.02], [0.14, 0.34, 0.3], [0, 0, s * 0.5]]),
    ['cone', '#f2994a', [0, 0.46, 0.38], [0.12, 0.14, 0.12], [PI / 2, 0, 0]],
    ...([1, -1] as const).map((s): Part => ['cylinder', '#f2994a', [s * 0.14, 0.06, 0.04], [0.05, 0.14, 0.05]]),
    ...([[-0.22, 0.7, 0.1], [0.2, 0.75, 0], [0.3, 0.5, -0.2]] as V3[]).map((at): Part => ['sphere', '#8796a8', at, [0.07, 0.07, 0.07]]),
    eyes(0.58, 0.33, 0.44),
  ],
  // A chubby baby dinosaur with a cream belly and soft back spikes.
  dinobud: [
    ['sphere', '#d9894a', [0, 0.36, -0.04], [0.68, 0.62, 0.72]],
    ['sphere', '#fff6e3', [0, 0.32, 0.18], [0.42, 0.42, 0.32]],
    ['sphere', '#d9894a', [0, 0.78, 0.12], [0.62, 0.52, 0.58]],
    ['cone', '#d9894a', [0, 0.22, -0.48], [0.24, 0.42, 0.18], [-PI / 2 - 0.3, 0, 0]],
    ...([0.98, 0.72, 0.46] as const).map((y, i): Part => ['cone', '#e2574c', [0, y + 0.08, -0.22 - i * 0.06], [0.12, 0.18, 0.12], [-0.4 - i * 0.3, 0, 0]]),
    ...([1, -1] as const).map((s): Part => ['capsule', '#d9894a', [s * 0.18, 0.08, 0.02], [0.16, 0.18, 0.18]]),
    eyes(0.84, 0.42, 0.42),
    mouth(0.68, 0.41),
  ],
  // The Greenhaven Guardian: a gentle, mossy stone golem with a glowing rune.
  guardian: [
    ['rbox', '#b6bec8', [0, 1.15, 0], [1.5, 1.5, 1.1]],
    ['dome', '#7cb342', [0, 1.62, 0], [1.56, 0.36, 1.16]],
    ...([-0.4, 0, 0.4] as const).map((x, i): Part => ['cone', '#5e9c35', [x, 2.02 + (i === 1 ? 0.08 : 0), 0], [0.18, 0.3, 0.18], [0, 0, -x * 0.6]]),
    ...([1, -1] as const).map((s): Part => ['rbox', '#a3acb6', [s * 0.95, 1.0, 0.05], [0.42, 0.9, 0.5], [0, 0, s * 0.12]]),
    ...([1, -1] as const).map((s): Part => ['rbox', '#8f98a3', [s * 0.36, 0.22, 0], [0.42, 0.46, 0.5]]),
    ['octa', '#6cc4f0', [0, 0.95, 0.56], [0.3, 0.36, 0.1]],
    ...([[-0.4, 0.62, 0.56], [0.45, 0.7, 0.56]] as V3[]).map((at): Part => ['sphere', '#8f98a3', at, [0.1, 0.1, 0.05]]),
    eyes(1.42, 0.555, 0.62),
    mouth(1.22, 0.555, 0.3),
  ],
}

const rune = new MeshStandardMaterial({ color: '#6cc4f0', emissive: '#3aa8e8', emissiveIntensity: 0.8, roughness: 0.4 })

export function buildMonster(kind: MonsterKind | 'guardian'): Group {
  const g = new Group()
  for (const [shape, colour, at, size, rot] of DESIGNS[kind]) {
    const face = shape.startsWith('eyes:') || shape.startsWith('mouth:')
    const m = new Mesh(geometry(shape), face ? faceMaterial(shape as `eyes:${string}`) : kind === 'guardian' && shape === 'octa' ? rune : material(colour))
    m.position.set(...at)
    m.scale.set(...size)
    if (rot) m.rotation.set(...rot)
    m.castShadow = !face
    g.add(m)
  }
  return g
}
