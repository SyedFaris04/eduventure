import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ConeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three'
import type { GameMap, TileKind } from '../game/map'
import { addWind } from './wind'

export const GROUND_DEPTH = 0.6 // tiles are boxes from y −0.6 to 0; the pond sits at −0.15 and the sea at −0.5
const TILE_COLOUR: Record<Exclude<TileKind, 'water' | 'bridge'>, string> = { grass: '#8bc34a', flowers: '#8bc34a', path: '#f2b872', sand: '#f3d9a4' }
const PETALS = ['#f7a8c4', '#fff6e3', '#f7c843', '#c9b6f2']

// Small stable hash so the world looks the same on every visit.
const hash = (x: number, y: number, k = 0) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453
  return s - Math.floor(s)
}

type Inst = { x: number; y: number; z: number; sx?: number; sy?: number; sz?: number; ry?: number; colour?: string }
/** One InstancedMesh for many copies of the same shape. */
function Instances({ geometry, material, items, castShadow = false, receiveShadow = true }: { geometry: BoxGeometry | ConeGeometry | SphereGeometry; material: MeshStandardMaterial; items: Inst[]; castShadow?: boolean; receiveShadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z)
      o.rotation.set(0, it.ry ?? 0, 0)
      o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.colour) m.setColorAt(i, c.set(it.colour))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [items])
  if (!items.length) return null
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} frustumCulled={false} />
}

/** Greenhaven's ground: chunky tiles with a little colour variety, cliffs around the island, the bridge, flowers and grass. */
export function Ground({ map }: { map: GameMap }) {
  const geo = useMemo(() => ({ tile: new BoxGeometry(1, GROUND_DEPTH, 1), petal: new SphereGeometry(0.07, 6, 4), tuft: new ConeGeometry(0.05, 0.22, 4), plank: new BoxGeometry(1, 0.08, 0.2) }), [])
  const mat = useMemo(
    () => ({
      tile: new MeshStandardMaterial({ roughness: 0.95 }),
      petal: new MeshStandardMaterial({ roughness: 0.7 }),
      tuft: addWind(new MeshStandardMaterial({ color: '#6fae4a', roughness: 0.9 }), 0.35),
      wood: new MeshStandardMaterial({ color: '#a0612f', roughness: 0.85 }),
      rope: new MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.9 }),
      cliff: new MeshStandardMaterial({ color: '#a98466', roughness: 1 }),
      cliffDark: new MeshStandardMaterial({ color: '#7d5c43', roughness: 1 }),
    }),
    [],
  )

  const parts = useMemo(() => {
    const tiles: Inst[] = []
    const petals: Inst[] = []
    const tufts: Inst[] = []
    const planks: Inst[] = []
    const posts: Inst[] = []
    map.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const cx = x + 0.5
        const cz = y + 0.5
        if (cell.tile === 'water') return
        if (cell.tile === 'bridge') {
          // Planks lie across the way you walk (the bridge runs along the row), with a small gap between them.
          for (let i = 0; i < 4; i++) planks.push({ x: x + 0.125 + i * 0.25, y: -0.04, z: cz, ry: Math.PI / 2, sz: 1.12 })
          for (const side of [-1, 1]) posts.push({ x: cx, y: 0.1, z: cz + side * 0.56, sx: 0.09, sy: 0.4, sz: 0.09 }, { x: cx, y: 0.24, z: cz + side * 0.56, sx: 1, sy: 0.04 / GROUND_DEPTH, sz: 0.05 })
          return
        }
        const base = new Color(TILE_COLOUR[cell.tile])
        const v = (hash(x, y) - 0.5) * 0.035
        base.offsetHSL(0, 0, v)
        const top = cell.tile === 'path' ? -0.02 : 0 // paths sit a touch lower, like worn ground
        tiles.push({ x: cx, y: top - GROUND_DEPTH / 2, z: cz, colour: `#${base.getHexString()}` })
        if (cell.tile === 'flowers' || (cell.tile === 'grass' && hash(x, y, 5) > 0.93))
          for (let i = 0; i < (cell.tile === 'flowers' ? 4 : 1); i++)
            petals.push({ x: x + 0.15 + hash(x, y, i) * 0.7, y: 0.05, z: y + 0.15 + hash(x, y, i + 9) * 0.7, colour: PETALS[Math.floor(hash(x, y, i + 3) * PETALS.length)] })
        if (cell.tile === 'grass' && !cell.prop && hash(x, y, 2) > 0.6)
          for (let i = 0; i < 3; i++) tufts.push({ x: x + 0.2 + hash(x, y, i + 20) * 0.6, y: 0.1, z: y + 0.2 + hash(x, y, i + 30) * 0.6, ry: hash(x, y, i) * 3, sy: 0.7 + hash(x, y, i + 40) * 0.6 })
      }),
    )
    return { tiles, petals, tufts, planks, posts }
  }, [map])

  return (
    <group>
      <Instances geometry={geo.tile} material={mat.tile} items={parts.tiles} />
      <Instances geometry={geo.petal} material={mat.petal} items={parts.petals} />
      <Instances geometry={geo.tuft} material={mat.tuft} items={parts.tufts} />
      <Instances geometry={geo.plank} material={mat.wood} items={parts.planks} castShadow />
      <Instances geometry={geo.tile} material={mat.rope} items={parts.posts} castShadow />
      {/* The island's rock base: a basin under the pond and cliffs on all four sides dropping into the sea. */}
      <mesh position={[map.width / 2, -GROUND_DEPTH - 0.7, map.height / 2]} material={mat.cliffDark}>
        <boxGeometry args={[map.width, 1.4, map.height]} />
      </mesh>
      {([
        [map.width / 2, -0.12, map.width + 0.3, 0.15],
        [map.width / 2, map.height + 0.12, map.width + 0.3, 0.15],
        [-0.12, map.height / 2, 0.15, map.height],
        [map.width + 0.12, map.height / 2, 0.15, map.height],
      ] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, -1.01, z]} material={mat.cliff} receiveShadow>
          <boxGeometry args={[w, 2, d]} />
        </mesh>
      ))}
    </group>
  )
}
