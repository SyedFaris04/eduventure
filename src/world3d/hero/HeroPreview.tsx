import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import type { Appearance } from '../../features/character/appearance'
import { HeroModel } from './HeroModel'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Turns smoothly to face front or back when the creator's Turn button is pressed. */
function Turntable({ appearance, facing }: { appearance: Appearance; facing: 'front' | 'back' }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const goal = facing === 'back' ? Math.PI : 0
    g.rotation.y = reduced() ? goal : g.rotation.y + (goal - g.rotation.y) * Math.min(1, dt * 8)
  })
  return (
    <group ref={ref}>
      <HeroModel appearance={appearance} reducedMotion={reduced()} />
    </group>
  )
}

/** Live creator preview: drag to spin the hero (no zoom or pan). Lazy-loaded with three.js. */
export default function HeroPreview({ appearance, facing = 'front' }: { appearance: Appearance; facing?: 'front' | 'back' }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 1.5, 6.2], fov: 30 }} gl={{ alpha: true, antialias: true }} shadows>
      <hemisphereLight args={['#bfe6ff', '#8bc34a', 1.4]} />
      <directionalLight position={[3, 6, 4]} intensity={2.2} color="#fff1d6" castShadow />
      <Suspense fallback={null}>
        <Turntable appearance={appearance} facing={facing} />
      </Suspense>
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={4} blur={2.4} far={2} />
      <OrbitControls target={[0, 1.1, 0]} enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2} />
    </Canvas>
  )
}
