import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Pet } from '../../features/pet/petRules'
import type { WorldSim } from '../../game/sim'
import { buildPet, PET_SCALE } from './buildPet'
import { followStep } from './follow'

type Props = { sim: WorldSim; pet: Pet | null | undefined; reduced: boolean }

/** The knowledge pet trotting after the hero (nothing until an egg has hatched). */
export const PetFollower = ({ pet, ...rest }: Props) => (pet ? <PetBody pet={pet} {...rest} /> : null)

function PetBody({ sim, pet, reduced }: Props & { pet: Pet }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const pos = useRef({ x: sim.hero.pos.x, y: sim.hero.pos.y - 0.9 })
  const model = useMemo(() => buildPet(pet.species, pet.stage, pet.form, pet.look), [pet.species, pet.stage, pet.form, pet.look])
  useFrame((_, dt) => {
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const before = pos.current
    const next = followStep(before, sim.hero.pos, sim.hero.facing, dt)
    const moved = Math.hypot(next.x - before.x, next.y - before.y)
    if (moved > 0.002) b.rotation.y = Math.atan2(next.x - before.x, next.y - before.y)
    pos.current = next
    r.position.set(next.x, 0, next.y)
    b.position.y = reduced ? 0 : Math.abs(Math.sin(performance.now() / 160)) * Math.min(0.12, moved * 6)
  })
  return (
    <group ref={root}>
      <group ref={body} scale={PET_SCALE[pet.stage]}>
        <primitive object={model} />
      </group>
    </group>
  )
}
