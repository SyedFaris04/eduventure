import { Mesh, type Object3D } from 'three'
import type { Appearance } from '../../features/character/appearance'
import { heroParts } from './parts'
import { faceMaterial, geometry, material } from './materials'

/**
 * Dresses a rig: one mesh per part, attached to its bone so the rig's animations carry it.
 * Geometry and materials are shared, so `dispose()` only takes the meshes off the bones.
 */
export function buildHero(appearance: Appearance, rig: Object3D): { group: Object3D; dispose(): void } {
  const meshes: Mesh[] = []
  for (const spec of heroParts(appearance)) {
    const bone = rig.getObjectByName(spec.bone)
    if (!bone) throw new Error(`rig is missing bone ${spec.bone}`)
    const face = spec.shape.startsWith('eyes:') || spec.shape.startsWith('mouth:')
    const mesh = new Mesh(geometry(spec.shape), face ? faceMaterial(spec.shape as `eyes:${string}`) : material(spec.colour))
    mesh.position.set(...spec.offset)
    mesh.scale.set(...spec.scale)
    if (spec.rotation) mesh.rotation.set(...spec.rotation)
    mesh.castShadow = !face
    mesh.userData = { slot: spec.slot, shared: true }
    bone.add(mesh)
    meshes.push(mesh)
  }
  return {
    group: rig,
    dispose() {
      for (const m of meshes) m.removeFromParent()
      meshes.length = 0
    },
  }
}

export type HeroBuild = ReturnType<typeof buildHero>
