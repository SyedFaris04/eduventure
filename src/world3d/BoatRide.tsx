import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { Appearance } from '../features/character/appearance'
import type { Theme } from '../game/map'
import { HeroModel } from './hero/HeroModel'
import { geometry, material } from './hero/materials'
import { HERO_SCALE } from './Actors'
import { THEMES, tileColour } from './themes'
import { waveMaterial } from './Water'
import { windTime } from './wind'

/** A painted perahu: a long hull with a curved bow and stern, stripes and a little sail. */
function Perahu() {
  const m = material
  return (
    <group>
      <mesh geometry={geometry('capsule')} material={m('#2f6fb3')} position={[0, 0.2, 0]} scale={[0.95, 3.1, 0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={geometry('box')} material={m('#a0612f')} position={[0, 0.38, 0]} scale={[0.82, 0.08, 2.6]} />
      <mesh geometry={geometry('box')} material={m('#f7c843')} position={[0, 0.3, 0]} scale={[0.98, 0.07, 2.8]} />
      <mesh geometry={geometry('box')} material={m('#e8473a')} position={[0, 0.22, 0]} scale={[0.99, 0.05, 2.9]} />
      {/* Curved bow and stern pieces, painted like an east-coast perahu. */}
      <mesh geometry={geometry('cone')} material={m('#e8473a')} position={[0, 0.62, 1.55]} scale={[0.16, 0.7, 0.3]} rotation={[0.5, 0, 0]} />
      <mesh geometry={geometry('cone')} material={m('#e8473a')} position={[0, 0.62, -1.55]} scale={[0.16, 0.7, 0.3]} rotation={[-0.5, 0, 0]} />
      <mesh geometry={geometry('cylinder')} material={m('#6b4a2e')} position={[0, 1.3, 0.5]} scale={[0.06, 1.9, 0.06]} />
      <mesh geometry={geometry('box')} material={m('#fff6e3')} position={[0, 1.45, 0.75]} scale={[0.04, 1.2, 0.5]} rotation={[0, 0, 0.04]} />
    </group>
  )
}

/** Two gulls circling over the boat. */
function Gulls() {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = windTime.value * 0.5
  })
  const white = material('#ffffff')
  return (
    <group ref={ref} position={[0, 4.2, 0]}>
      {[3, -3.6].map((x, i) => (
        <group key={i} position={[x, i * 0.6, 0]}>
          <mesh geometry={geometry('box')} material={white} position={[-0.22, 0, 0]} scale={[0.45, 0.04, 0.14]} rotation={[0, 0, 0.35]} />
          <mesh geometry={geometry('box')} material={white} position={[0.22, 0, 0]} scale={[0.45, 0.04, 0.14]} rotation={[0, 0, -0.35]} />
        </group>
      ))}
    </group>
  )
}

function Scene({ hero, theme, durationMs, startedAt }: { hero: Appearance; theme: Theme; durationMs: number; startedAt: number }) {
  const boat = useRef<Group>(null)
  const island = useRef<Mesh>(null)
  const sea = useMemo(() => waveMaterial(THEMES[theme].water, 0.12), [theme])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    state.camera.lookAt(-1.5, 0.9, 6)
    windTime.value = t
    const p = Math.min(1, (performance.now() - startedAt) / durationMs)
    if (boat.current) {
      boat.current.rotation.z = Math.sin(t * 1.6) * 0.05
      boat.current.rotation.x = Math.sin(t * 1.1) * 0.03
      boat.current.position.y = Math.sin(t * 1.6) * 0.06
    }
    // The destination grows on the horizon as the ride goes on.
    if (island.current) {
      island.current.position.z = 60 - p * 40
      island.current.scale.setScalar(0.8 + p * 1.6)
    }
  })
  return (
    <>
      <color attach="background" args={[THEMES[theme].sky]} />
      <fog attach="fog" args={[THEMES[theme].sky, 40, 120]} />
      <hemisphereLight args={['#bfe6ff', '#4fb0dd', 1.2]} />
      <directionalLight position={[8, 10, -7]} intensity={2.3} color="#fff1d6" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 20]} material={sea}>
        <planeGeometry args={[160, 160, 70, 70]} />
      </mesh>
      <mesh ref={island} geometry={geometry('dome')} material={material(tileColour(theme, 'grass'))} position={[-6, -0.4, 60]} scale={[12, 5, 9]} />
      <group ref={boat}>
        <Perahu />
        <Suspense fallback={null}>
          <HeroModel appearance={hero} position={[0, 0.42, -0.4]} rotation={[0, 1.9, 0]} scale={HERO_SCALE} reducedMotion />
        </Suspense>
      </group>
      <Gulls />
    </>
  )
}

/** The boat ride between places: a perahu rocking on the sea while the next island loads. */
export default function BoatRide({ hero, theme, durationMs, startedAt }: { hero: Appearance; theme: Theme; durationMs: number; startedAt: number }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 42, position: [6.5, 3.6, -5], near: 0.5, far: 160 }}>
      <Scene hero={hero} theme={theme} durationMs={durationMs} startedAt={startedAt} />
    </Canvas>
  )
}
