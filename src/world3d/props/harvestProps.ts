import { Euler, Matrix4, MeshStandardMaterial, type BufferGeometry, type Material } from 'three'
import type { CampBuild, PropKind } from '../../game/map'
import { geometry, material } from '../hero/materials'
import type { Shape } from '../hero/parts'
import { addWind } from '../wind'

type V3 = [number, number, number]
export type Part = [Shape, Material, V3, V3, V3?]
export type HarvestKind = 'harvest_tree' | 'harvest_rock' | 'crystal' | 'herb'
export type ModelPart = { geometry: BufferGeometry; material: Material; local: Matrix4 }

const m = material
const glows = new Map<string, MeshStandardMaterial>()
export const glow = (c: string) => {
  let g = glows.get(c)
  if (!g) glows.set(c, (g = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.35 })))
  return g
}
const leaves = new Map<string, MeshStandardMaterial>()
const leaf = (c: string) => {
  let l = leaves.get(c)
  if (!l) leaves.set(c, (l = addWind(new MeshStandardMaterial({ color: c, roughness: 0.85 }), 0.1)))
  return l
}

/** Harvest nodes, ready and regrowing. Ready trees carry fruit and herbs carry flowers, so players learn what to tap. */
const NODES: Record<HarvestKind, { ready: () => Part[]; regrowing: () => Part[] }> = {
  harvest_tree: {
    ready: () => [
      ['cylinder', m('#8a5a33'), [0, 0.45, 0], [0.18, 0.9, 0.18]],
      ['sphere', leaf('#5aa83c'), [0, 1.15, 0], [0.9, 0.75, 0.9]],
      ['sphere', leaf('#6dbb4a'), [0.22, 1.35, 0.12], [0.55, 0.45, 0.55]],
      ['sphere', m('#e8743a'), [0.3, 1.0, 0.32], [0.09, 0.09, 0.09]],
      ['sphere', m('#e8743a'), [-0.28, 1.1, 0.24], [0.09, 0.09, 0.09]],
    ],
    regrowing: () => [
      ['cylinder', m('#8a5a33'), [0, 0.1, 0], [0.22, 0.2, 0.22]],
      ['cylinder', m('#cfa877'), [0, 0.205, 0], [0.2, 0.01, 0.2]],
      ['sphere', leaf('#7cc04a'), [0.12, 0.3, 0], [0.16, 0.16, 0.16]],
    ],
  },
  harvest_rock: {
    ready: () => [
      ['sphere', m('#8d939b'), [0, 0.26, 0], [0.75, 0.5, 0.65]],
      ['sphere', m('#a3a9b0'), [0.18, 0.38, 0.1], [0.36, 0.3, 0.32]],
      ['sphere', m('#f4f1ea'), [-0.15, 0.42, 0.2], [0.06, 0.04, 0.06]],
      ['sphere', m('#f4f1ea'), [0.12, 0.3, 0.28], [0.05, 0.04, 0.05]],
    ],
    regrowing: () => [
      ['sphere', m('#8d939b'), [-0.15, 0.07, 0], [0.18, 0.12, 0.16]],
      ['sphere', m('#a3a9b0'), [0.14, 0.06, 0.08], [0.14, 0.1, 0.12]],
    ],
  },
  crystal: {
    ready: () => [
      ['sphere', m('#6f7680'), [0, 0.2, 0], [0.7, 0.4, 0.6]],
      ['octa', glow('#6fd0ff'), [0, 0.62, 0], [0.16, 0.38, 0.16]],
      ['octa', glow('#9be3ff'), [0.2, 0.5, 0.08], [0.1, 0.24, 0.1], [0, 0, -0.4]],
      ['octa', glow('#6fd0ff'), [-0.18, 0.46, -0.06], [0.09, 0.2, 0.09], [0, 0, 0.45]],
    ],
    regrowing: () => [['sphere', m('#6f7680'), [0, 0.18, 0], [0.62, 0.34, 0.54]]],
  },
  herb: {
    ready: () => [
      ['sphere', leaf('#4f9a3a'), [0, 0.22, 0], [0.62, 0.42, 0.58]],
      ['sphere', m('#f48fb1'), [0.16, 0.42, 0.1], [0.07, 0.07, 0.07]],
      ['sphere', m('#fff6e3'), [-0.14, 0.4, 0.14], [0.07, 0.07, 0.07]],
      ['sphere', m('#f48fb1'), [-0.05, 0.44, -0.16], [0.07, 0.07, 0.07]],
    ],
    regrowing: () => [['sphere', leaf('#5aa83c'), [0, 0.08, 0], [0.3, 0.16, 0.28]]],
  },
}

/** The workbench and the camp builds (drawn once an island has built them). */
const CAMP: Record<'workbench' | CampBuild, () => Part[]> = {
  workbench: () => [
    ['box', m('#9c6b3c'), [0, 0.55, 0], [1.0, 0.1, 0.6]],
    ...([[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]] as const).map(([x, z]): Part => ['box', m('#7a4f2a'), [x, 0.27, z], [0.08, 0.54, 0.08]]),
    ['box', m('#b8bec6'), [-0.2, 0.63, 0.05], [0.34, 0.03, 0.12]], // saw blade
    ['cylinder', m('#5a3d30'), [0.25, 0.65, -0.05], [0.05, 0.3, 0.05], [0, 0, Math.PI / 2]], // hammer handle
    ['box', m('#6f7680'), [0.38, 0.65, -0.05], [0.08, 0.1, 0.14]],
  ],
  camp_bench: () => [
    ['box', m('#9c6b3c'), [0, 0.38, 0], [1.1, 0.08, 0.36]],
    ['box', m('#8a5a33'), [0, 0.62, -0.16], [1.1, 0.26, 0.06]],
    ...([-0.45, 0.45] as const).map((x): Part => ['box', m('#7a4f2a'), [x, 0.19, 0], [0.08, 0.38, 0.3]]),
  ],
  camp_lantern: () => [
    ['cylinder', m('#5a3d30'), [0, 0.7, 0], [0.07, 1.4, 0.07]],
    ['box', m('#5a3d30'), [0.15, 1.38, 0], [0.32, 0.05, 0.05]],
    ['sphere', glow('#ffd54f'), [0.28, 1.22, 0], [0.16, 0.2, 0.16]],
  ],
  camp_flag: () => [
    ['cylinder', m('#cfd6df'), [0, 1.0, 0], [0.05, 2.0, 0.05]],
    ['box', m('#e85a4f'), [0.3, 1.75, 0], [0.55, 0.32, 0.02]],
    ['box', m('#f2c14e'), [0.3, 1.75, 0.012], [0.2, 0.12, 0.01]],
  ],
  whiteboard: () => [
    ...([-0.55, 0.55] as const).map((x): Part => ['box', m('#8a96a8'), [x, 0.7, 0], [0.06, 1.4, 0.06]]),
    ['box', m('#f7f9fc'), [0, 1.05, 0.03], [1.2, 0.75, 0.04]],
    ['box', m('#8a96a8'), [0, 0.66, 0.08], [1.2, 0.04, 0.12]],
    ['box', m('#4fa3d9'), [-0.25, 1.15, 0.06], [0.4, 0.03, 0.01]],
    ['box', m('#e85a4f'), [0.15, 0.98, 0.06], [0.5, 0.03, 0.01]],
  ],
}

export function toParts(parts: Part[]): ModelPart[] {
  return parts.map(([shape, mat, at, size, rot]) => ({
    geometry: geometry(shape),
    material: mat,
    local: new Matrix4().makeTranslation(...at).multiply(new Matrix4().makeRotationFromEuler(new Euler(...(rot ?? [0, 0, 0])))).multiply(new Matrix4().makeScale(...size)),
  }))
}

const cache = new Map<string, ModelPart[]>()
export function harvestParts(kind: HarvestKind, ready: boolean): ModelPart[] {
  const key = `${kind}:${ready}`
  let p = cache.get(key)
  if (!p) cache.set(key, (p = toParts(NODES[kind][ready ? 'ready' : 'regrowing']())))
  return p
}
export function campParts(kind: 'workbench' | CampBuild): ModelPart[] {
  let p = cache.get(kind)
  if (!p) cache.set(kind, (p = toParts(CAMP[kind]())))
  return p
}

export const HARVEST_KINDS: HarvestKind[] = ['harvest_tree', 'harvest_rock', 'crystal', 'herb']
export const isHarvestKind = (k: PropKind): k is HarvestKind => (HARVEST_KINDS as string[]).includes(k)
