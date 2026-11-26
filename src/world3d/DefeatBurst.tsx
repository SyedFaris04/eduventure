import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from 'three'
import { defeatBurst } from './finisher'

const N = 24
const LIFE = 1.2 // seconds
const COLOURS = ['#fff6c2', '#ffd54f', '#ffffff', '#9be7ff']

/** The defeat cutscene's blow: sparkles burst up and out of the monster, and a bright ring spreads over the ground. */
export function DefeatBurst() {
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const dirs = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2, up: 2.4 + (i % 4) * 0.7, out: 1.1 + (i % 3) * 0.6 })), [])
  useFrame(() => {
    const g = group.current
    if (!g) return
    const age = (performance.now() - defeatBurst.at) / 1000
    g.visible = defeatBurst.at > 0 && age < LIFE
    if (!g.visible) return
    g.position.set(defeatBurst.x, 0.5, defeatBurst.z)
    const k = age / LIFE
    dirs.forEach((d, i) => {
      const c = g.children[i]
      c.position.set(Math.cos(d.a) * d.out * age, d.up * age - 3.2 * age * age, Math.sin(d.a) * d.out * age)
      c.rotation.set(age * 6, age * 8, 0)
      c.scale.setScalar(1 - k)
    })
    if (ring.current) {
      ring.current.scale.setScalar(0.3 + k * 2.6)
      ;(ring.current.material as MeshBasicMaterial).opacity = 0.8 * (1 - k)
    }
  })
  return (
    <group ref={group} visible={false}>
      {dirs.map((_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.16]} />
          <meshBasicMaterial color={COLOURS[i % COLOURS.length]} toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <ringGeometry args={[0.7, 0.85, 40]} />
        <meshBasicMaterial color="#fff6c2" transparent depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}
