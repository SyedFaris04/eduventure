import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ConeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three'
import type { GameMap } from '../game/map'
import { tileColour } from './themes'
import { addWind } from './wind'

export const GROUND_DEPTH = 0.6 // tiles are boxes from y −0.6 to 0; the pond sits at −0.15 and the sea at −0.5
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

/**
 * A place's ground: chunky tiles in the theme's colours, cliffs around the island, bridges, the jetty, flowers and grass.
 * `lush` (High graphics) adds a meadow of swaying blades in shades of the island's own grass.
 */
export function Ground({ map, lush = false }: { map: GameMap; lush?: boolean }) {
  const geo = useMemo(() => ({ tile: new BoxGeometry(1, GROUND_DEPTH, 1), petal: new SphereGeometry(0.07, 6, 4), tuft: new ConeGeometry(0.05, 0.22, 4), plank: new BoxGeometry(1, 0.08, 0.2), blade: new ConeGeometry(0.035, 0.3, 3).translate(0, 0.15, 0) }), [])
  const mat = useMemo(
    () => ({
      tile: new MeshStandardMaterial({ roughness: 0.95 }),
      petal: new MeshStandardMaterial({ roughness: 0.7 }),
      tuft: addWind(new MeshStandardMaterial({ color: '#6fae4a', roughness: 0.9 }), 0.35),
      blade: addWind(new MeshStandardMaterial({ roughness: 0.9 }), 0.45),
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
    const cliffs: Inst[] = []
    const open = (x: number, y: number) => ['water', 'jetty'].includes(map.cells[y]?.[x]?.tile ?? '')
    // Cliff faces along the island's edge, left open where water or the jetty meets the sea.
    for (let x = 0; x < map.width; x++) {
      if (!open(x, 0)) cliffs.push({ x: x + 0.5, y: -1.01, z: -0.08, sx: 1, sy: 2 / GROUND_DEPTH, sz: 0.15 })
      if (!open(x, map.height - 1)) cliffs.push({ x: x + 0.5, y: -1.01, z: map.height + 0.08, sx: 1, sy: 2 / GROUND_DEPTH, sz: 0.15 })
    }
    for (let y = 0; y < map.height; y++) {
      if (!open(0, y)) cliffs.push({ x: -0.08, y: -1.01, z: y + 0.5, sx: 0.15, sy: 2 / GROUND_DEPTH, sz: 1 })
      if (!open(map.width - 1, y)) cliffs.push({ x: map.width + 0.08, y: -1.01, z: y + 0.5, sx: 0.15, sy: 2 / GROUND_DEPTH, sz: 1 })
    }
    map.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const cx = x + 0.5
        const cz = y + 0.5
        if (cell.tile === 'water') return
        if (cell.tile === 'jetty') {
          // Jetty boards run across the way you walk out to sea, on posts standing in the water.
          for (let i = 0; i < 4; i++) planks.push({ x: cx, y: -0.04, z: y + 0.125 + i * 0.25, sx: 1.04 })
          for (const side of [-1, 1]) posts.push({ x: cx + side * 0.47, y: -0.45, z: cz, sx: 0.12, sy: 1 / GROUND_DEPTH, sz: 0.12 })
          return
        }
        if (cell.tile === 'bridge') {
          // Planks lie across the way you walk (the bridge runs along the row), with a small gap between them.
          for (let i = 0; i < 4; i++) planks.push({ x: x + 0.125 + i * 0.25, y: -0.04, z: cz, ry: Math.PI / 2, sz: 1.12 })
          for (const side of [-1, 1]) posts.push({ x: cx, y: 0.1, z: cz + side * 0.56, sx: 0.09, sy: 0.4, sz: 0.09 }, { x: cx, y: 0.24, z: cz + side * 0.56, sx: 1, sy: 0.04 / GROUND_DEPTH, sz: 0.05 })
          return
        }
        const base = new Color(tileColour(map.theme, cell.tile))
        const v = (hash(x, y) - 0.5) * 0.035
        base.offsetHSL(0, 0, v)
        const top = cell.tile === 'path' || cell.tile === 'mud' || cell.tile === 'stone' ? -0.02 : cell.tile === 'snow' ? 0.03 : 0 // paths sit a touch lower, like worn ground; snow a touch higher
        tiles.push({ x: cx, y: top - GROUND_DEPTH / 2, z: cz, colour: `#${base.getHexString()}` })
        if (cell.tile === 'flowers' || (cell.tile === 'grass' && hash(x, y, 5) > 0.93))
          for (let i = 0; i < (cell.tile === 'flowers' ? 4 : 1); i++)
            petals.push({ x: x + 0.15 + hash(x, y, i) * 0.7, y: 0.05, z: y + 0.15 + hash(x, y, i + 9) * 0.7, colour: PETALS[Math.floor(hash(x, y, i + 3) * PETALS.length)] })
        if (cell.tile === 'grass' && !cell.prop && hash(x, y, 2) > 0.6)
          for (let i = 0; i < 3; i++) tufts.push({ x: x + 0.2 + hash(x, y, i + 20) * 0.6, y: 0.1, z: y + 0.2 + hash(x, y, i + 30) * 0.6, ry: hash(x, y, i) * 3, sy: 0.7 + hash(x, y, i + 40) * 0.6 })
      }),
    )
    return { tiles, petals, tufts, planks, posts, cliffs }
  }, [map])

  const blades = useMemo(() => {
    if (!lush) return []
    const out: Inst[] = []
    const green = new Color(tileColour(map.theme, 'grass'))
    map.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        if ((cell.tile !== 'grass' && cell.tile !== 'flowers') || cell.prop) return
        for (let i = 0; i < 7; i++) {
          const shade = green.clone().offsetHSL(0, 0.04, -0.1 + hash(x, y, i + 60) * 0.16)
          out.push({ x: x + 0.08 + hash(x, y, i + 50) * 0.84, y: 0, z: y + 0.08 + hash(x, y, i + 70) * 0.84, ry: hash(x, y, i + 80) * 3, sy: 0.6 + hash(x, y, i + 90) * 0.8, colour: `#${shade.getHexString()}` })
        }
      }),
    )
    return out
  }, [map, lush])

  return (
    <group>
      <Instances geometry={geo.tile} material={mat.tile} items={parts.tiles} />
      <Instances geometry={geo.petal} material={mat.petal} items={parts.petals} />
      <Instances geometry={geo.tuft} material={mat.tuft} items={parts.tufts} />
      <Instances key={blades.length} geometry={geo.blade} material={mat.blade} items={blades} />
      <Instances geometry={geo.plank} material={mat.wood} items={parts.planks} castShadow />
      <Instances geometry={geo.tile} material={mat.rope} items={parts.posts} castShadow />
      {/* The island's rock base: a basin under the pond and cliffs on all four sides dropping into the sea. */}
      <mesh position={[map.width / 2, -GROUND_DEPTH - 0.7, map.height / 2]} material={mat.cliffDark}>
        <boxGeometry args={[map.width, 1.4, map.height]} />
      </mesh>
      <Instances geometry={geo.tile} material={mat.cliff} items={parts.cliffs} />
    </group>
  )
}
