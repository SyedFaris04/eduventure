import { useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, type Material, type BufferGeometry } from 'three'
import type { GameMap, PropKind } from '../game/map'
import { addWind } from './wind'
import { buildCodeProp, isCodeProp, type CodePropKind } from './props/codeProps'

const URL = (n: string) => `/assets/models/${n}.glb`
export const PROP_MODELS = ['tree_a', 'tree_b', 'rock_a', 'rock_b', 'rock_c', 'house_a', 'house_b', 'well', 'fence'] as const
type Model = (typeof PROP_MODELS)[number]

/** Footprint each model is scaled to, in tiles (houses cover 2 × 2). */
const FIT: Record<Model, number> = { tree_a: 1.25, tree_b: 1.25, rock_a: 0.8, rock_b: 0.8, rock_c: 0.75, house_a: 2.1, house_b: 2.1, well: 0.95, fence: 1.02 }
const hash = (x: number, y: number, k = 0) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453
  return s - Math.floor(s)
}

type Placement = { model: Model; x: number; z: number; ry: number; s: number }
type CodePlacement = { kind: CodePropKind; x: number; z: number; ry: number; s: number }

/** Props that turn freely (plants); buildings and monuments keep their fronts toward the camera side. */
const SPIN: Partial<Record<CodePropKind, boolean>> = { palm: true, fern: true, mangrove: true, mushroom: true, pine_snow: true }

function codePlacements(map: GameMap): CodePlacement[] {
  return map.props.flatMap((p) => {
    if (!isCodeProp(p.kind)) return []
    const h = hash(p.x, p.y)
    // Kampung houses cover 2 × 2 tiles and the Code Academy 3 × 3, from their top-left cell.
    const half = p.kind === 'academy' ? 1.5 : p.kind === 'kampung_house' ? 1 : 0.5
    return [{ kind: p.kind, x: p.x + half, z: p.y + half, ry: SPIN[p.kind] ? h * 6.283 : 0, s: SPIN[p.kind] ? 0.85 + hash(p.x, p.y, 1) * 0.3 : 1 }]
  })
}

function placements(map: GameMap): Placement[] {
  const out: Placement[] = []
  const at = (x: number, y: number) => map.cells[y]?.[x]?.prop
  for (const p of map.props) {
    const h = hash(p.x, p.y)
    const c = { x: p.x + 0.5, z: p.y + 0.5 }
    const kinds: Partial<Record<PropKind, () => Placement>> = {
      tree: () => ({ model: h > 0.5 ? 'tree_a' : 'tree_b', ...c, ry: h * 6.283, s: 0.85 + hash(p.x, p.y, 1) * 0.35 }),
      rock: () => ({ model: (['rock_a', 'rock_b', 'rock_c'] as const)[Math.floor(h * 3)], ...c, ry: h * 6.283, s: 0.9 + h * 0.3 }),
      house: () => ({ model: h > 0.5 ? 'house_a' : 'house_b', x: p.x + 1, z: p.y + 1, ry: 0, s: 1 }),
      well: () => ({ model: 'well', ...c, ry: 0, s: 1 }),
      // Fences run along a row unless the neighbours above or below are fences too.
      fence: () => ({ model: 'fence', ...c, ry: at(p.x, p.y - 1) === 'fence' || at(p.x, p.y + 1) === 'fence' ? Math.PI / 2 : 0, s: 1 }),
    }
    const make = kinds[p.kind]
    if (make) out.push(make())
  }
  return out
}

/** Every mesh of a model, with its transform inside the model, normalised to the footprint and standing on y = 0. */
function useModelParts(model: Model) {
  const { scene } = useGLTF(URL(model))
  return useMemo(() => {
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    // Fences fit their length to one tile; everything else fits its widest side.
    const k = FIT[model] / Math.max(size.x, size.z)
    const fix = new Matrix4().makeScale(k, k, k).multiply(new Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2))
    const parts: { geometry: BufferGeometry; material: Material; local: Matrix4 }[] = []
    const trees = model.startsWith('tree')
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return
      const base = o.material as MeshStandardMaterial
      // Trees sway; the wind bends the top of the model more than its trunk.
      const material = trees ? addWind(base.clone(), 0.08 / (size.y * k)) : base // the top moves about 0.08 tiles
      parts.push({ geometry: o.geometry, material, local: fix.clone().multiply(o.matrixWorld) })
    })
    // Long side of the fence along x, so rotation 0 means "runs along the row".
    const turn = model === 'fence' && size.z > size.x ? new Matrix4().makeRotationY(Math.PI / 2) : new Matrix4()
    return parts.map((p) => ({ ...p, local: turn.clone().multiply(p.local) }))
  }, [scene, model])
}

/** Each mesh of a code-built prop with its transform inside the prop, like useModelParts for a model. */
function useCodeParts(kind: CodePropKind) {
  return useMemo(() => {
    const g = buildCodeProp(kind)
    g.updateMatrixWorld(true)
    const parts: { geometry: BufferGeometry; material: Material; local: Matrix4 }[] = []
    g.traverse((o) => o instanceof Mesh && parts.push({ geometry: o.geometry, material: o.material as Material, local: o.matrixWorld.clone() }))
    return parts
  }, [kind])
}

function CodeInstances({ kind, items, shadows }: { kind: CodePropKind; items: CodePlacement[]; shadows: boolean }) {
  const parts = useCodeParts(kind)
  return (
    <>
      {parts.map((p, i) => (
        <PartInstances key={i} part={p} items={items} shadows={shadows} />
      ))}
    </>
  )
}

function ModelInstances({ model, items, shadows }: { model: Model; items: Placement[]; shadows: boolean }) {
  const parts = useModelParts(model)
  return (
    <>
      {parts.map((p, i) => (
        <PartInstances key={i} part={p} items={items} shadows={shadows} />
      ))}
    </>
  )
}

function PartInstances({ part, items, shadows }: { part: { geometry: BufferGeometry; material: Material; local: Matrix4 }; items: { x: number; z: number; ry: number; s: number }[]; shadows: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const world = new Matrix4()
    items.forEach((it, i) => {
      world.compose(new Vector3(it.x, 0, it.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), it.ry), new Vector3(it.s, it.s, it.s))
      m.setMatrixAt(i, world.multiply(part.local))
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [items, part])
  return <instancedMesh ref={ref} args={[part.geometry, part.material, items.length]} castShadow={shadows} receiveShadow frustumCulled={false} />
}

const bushGeo = new SphereGeometry(0.5, 12, 8)
const bushMat = addWind(new MeshStandardMaterial({ color: '#5e9c35', roughness: 0.9 }), 0.03)
const bushLight = addWind(new MeshStandardMaterial({ color: '#7cb342', roughness: 0.9 }), 0.03)

/** Code-built bush: a cluster of squashed spheres (no pack provides one in this style). */
function Bushes({ map }: { map: GameMap }) {
  const items = map.props.filter((p) => p.kind === 'bush')
  return (
    <>
      {items.map((p) => (
        <group key={`${p.x},${p.y}`} position={[p.x + 0.5, 0, p.y + 0.5]} rotation={[0, hash(p.x, p.y) * 6.28, 0]}>
          <mesh geometry={bushGeo} material={bushMat} position={[0, 0.28, 0]} scale={[0.8, 0.56, 0.75]} castShadow />
          <mesh geometry={bushGeo} material={bushLight} position={[0.22, 0.36, 0.12]} scale={[0.5, 0.44, 0.48]} castShadow />
          <mesh geometry={bushGeo} material={bushMat} position={[-0.2, 0.32, 0.14]} scale={[0.46, 0.4, 0.44]} castShadow />
        </group>
      ))}
    </>
  )
}

export function Props({ map, shadows }: { map: GameMap; shadows: boolean }) {
  const byModel = useMemo(() => {
    const groups = new Map<Model, Placement[]>()
    for (const p of placements(map)) groups.set(p.model, [...(groups.get(p.model) ?? []), p])
    return [...groups]
  }, [map])
  const byCode = useMemo(() => {
    const groups = new Map<CodePropKind, CodePlacement[]>()
    for (const p of codePlacements(map)) groups.set(p.kind, [...(groups.get(p.kind) ?? []), p])
    return [...groups]
  }, [map])
  return (
    <group>
      {byModel.map(([model, items]) => (
        <ModelInstances key={model} model={model} items={items} shadows={shadows} />
      ))}
      {byCode.map(([kind, items]) => (
        <CodeInstances key={kind} kind={kind} items={items} shadows={shadows} />
      ))}
      <Bushes map={map} />
    </group>
  )
}

export const preloadProps = () => PROP_MODELS.forEach((m) => useGLTF.preload(URL(m)))
export const clearProps = () => PROP_MODELS.forEach((m) => useGLTF.clear(URL(m)))
