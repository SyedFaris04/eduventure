import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { CanvasTexture, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, RepeatWrapping, type Group } from 'three'
import type { GameMap } from '../game/map'
import { geometry, material } from './hero/materials'
import { POND_Y, waterRegions } from './Water'
import { windTime } from './wind'

/** Wau bulan: a moon kite drifting in a slow figure-8 high above the kampung (still under reduced motion). */
function Wau({ map }: { map: GameMap }) {
  const ref = useRef<Group>(null)
  const cx = map.width / 2
  const cz = map.height / 2 - 4
  useFrame(() => {
    const t = windTime.value * 0.25
    if (!ref.current) return
    ref.current.position.set(cx + Math.sin(t) * 5, 8.5 + Math.sin(t * 2) * 0.6, cz + Math.sin(t * 2) * 2)
    ref.current.rotation.z = Math.sin(t * 2) * 0.25
  })
  const body = material('#e8473a')
  const trim = material('#f7c843')
  const blue = material('#2f6fb3')
  return (
    <group ref={ref} position={[cx, 8.5, cz]} rotation={[0, Math.PI / 4, 0]} scale={1.4}>
      {/* Head, wings and the crescent tail of the wau bulan. */}
      <mesh geometry={geometry('octa')} material={body} position={[0, 0.55, 0]} scale={[0.45, 0.55, 0.06]} />
      <mesh geometry={geometry('octa')} material={blue} position={[0, 0.1, 0]} scale={[1.6, 0.42, 0.05]} />
      <mesh geometry={geometry('octa')} material={trim} position={[0, 0.1, 0.01]} scale={[1.1, 0.26, 0.05]} />
      <mesh geometry={geometry('arc')} material={body} position={[0, -0.55, 0]} rotation={[0, 0, Math.PI]} scale={[1.1, 0.8, 0.6]} />
      <mesh geometry={geometry('box')} material={trim} position={[0, -0.1, 0]} scale={[0.04, 1.3, 0.04]} />
    </group>
  )
}

function stripes(): CanvasTexture | null {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 64
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = '#bfe9ff'
  g.fillRect(0, 0, 32, 64)
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#8fd3f5'
    g.fillRect((i * 37) % 30, (i * 23) % 64, 2 + (i % 3), 18)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(2, 1)
  return t
}

/** Air Terjun: water pouring off the cliff into the island's biggest pond, with a rock face behind it. */
function Waterfall({ map, mist }: { map: GameMap; mist: boolean }) {
  const pond = useMemo(() => waterRegions(map).filter((r) => !r.sea).sort((a, b) => b.tiles - a.tiles)[0], [map])
  const tex = useMemo(stripes, [])
  const sheet = useMemo(() => new MeshBasicMaterial({ color: '#d8f3ff', map: tex, transparent: true, opacity: 0.85, side: DoubleSide }), [tex])
  const rock = useMemo(() => new MeshStandardMaterial({ color: '#7d6b58', roughness: 1 }), [])
  useFrame(() => {
    if (tex) tex.offset.y = windTime.value * 1.2
  })
  if (!pond) return null
  const z = pond.z - pond.d / 2 // the north edge, under the cliff
  const h = 3.2
  return (
    <group position={[pond.x, 0, z]}>
      <mesh material={rock} position={[0, h / 2 - 0.3, -0.75]} castShadow receiveShadow>
        <boxGeometry args={[pond.w + 2, h + 0.6, 1.2]} />
      </mesh>
      <mesh material={sheet} position={[0, POND_Y + h / 2, -0.12]}>
        <planeGeometry args={[2.2, h]} />
      </mesh>
      {mist && <Sparkles count={30} scale={[2.6, 0.8, 1.4]} position={[0, 0.2, 0.4]} size={6} speed={0.6} color="#ffffff" />}
    </group>
  )
}

/** Each theme's set pieces: the kite over the kampung, the rainforest waterfall, snow drifting on the mountain. */
export function Decor({ map, fancy }: { map: GameMap; fancy: boolean }) {
  if (map.theme === 'kampung') return <Wau map={map} />
  if (map.theme === 'rainforest') return <Waterfall map={map} mist={fancy} />
  return fancy ? <Sparkles count={120} scale={[30, 10, 30]} position={[map.width / 2, 5, map.height / 3]} size={5} speed={0.2} color="#ffffff" /> : null
}
