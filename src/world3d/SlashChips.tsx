import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { useGame } from '../game/store'
import type { Material } from '../game/map'

const COLOUR: Record<Material, string> = { wood: '#a0703f', stone: '#9aa3ad', herbs: '#6cbf4a', crystal: '#9be7ff' }
const N = 7
const LIFE = 0.45

/** A small burst of chips at the node on every swing (wood, stone, leaves or crystal shards). */
export function SlashChips() {
  const req = useGame((s) => s.slashReq)
  const group = useRef<Group>(null)
  const born = useRef<{ seq: number; t: number }>({ seq: -1, t: -10 })
  const dirs = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2, up: 1.6 + (i % 3) * 0.5, out: 1 + (i % 2) * 0.6 })), [])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g || !req) return
    const now = clock.elapsedTime
    if (req.seq !== born.current.seq) born.current = { seq: req.seq, t: now }
    const age = now - born.current.t
    g.visible = age < LIFE
    if (!g.visible) return
    g.position.set(req.x + 0.5, 0.6, req.y + 0.5)
    g.children.forEach((c, i) => {
      const d = dirs[i]
      ;(c as Mesh).position.set(Math.cos(d.a) * d.out * age, d.up * age - 4.5 * age * age, Math.sin(d.a) * d.out * age)
      c.rotation.set(age * 9, age * 7, 0)
      c.scale.setScalar(1 - age / LIFE)
    })
  })
  const colour = COLOUR[req?.material ?? 'wood']
  return (
    <group ref={group} visible={false}>
      {dirs.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color={colour} />
        </mesh>
      ))}
    </group>
  )
}
