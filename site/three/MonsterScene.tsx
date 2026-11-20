import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { buildMonster } from '../../src/world3d/monsters/buildMonster'

function Sproutling({ hits }: { hits: number }) {
  const model = useMemo(() => buildMonster('sproutling'), [])
  const ref = useRef<Group>(null)
  const last = useRef({ hits, at: -10 })
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (hits !== last.current.hits) last.current = { hits, at: t }
    const since = t - last.current.at
    const shake = since < 0.5 ? Math.sin(since * 60) * 0.15 * (1 - since / 0.5) : 0
    if (ref.current) {
      ref.current.position.x = shake
      ref.current.rotation.y = Math.sin(t * 0.8) * 0.4
      ref.current.position.y = Math.abs(Math.sin(t * 2.2)) * 0.08
    }
  })
  return <primitive ref={ref} object={model} />
}

/** The game's Sproutling, bouncing; it shakes each time `hits` goes up. */
export default function MonsterScene({ hits, active }: { hits: number; active: boolean }) {
  return (
    <Canvas dpr={[1, 2]} frameloop={active ? 'always' : 'never'} camera={{ position: [0, 1.2, 3.4], fov: 35 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <group position={[0, -0.6, 0]}>
        <Sproutling hits={hits} />
      </group>
    </Canvas>
  )
}
