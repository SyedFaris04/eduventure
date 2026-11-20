import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Pet } from '../../features/pet/petRules'
import type { Point } from '../../game/iso'
import { buildPet, PET_SCALE } from './buildPet'
import { followStep } from './follow'

/** Whoever the pet follows: this player's hero, or another player's gliding hero. */
export type Leader = { hero: { pos: Point; facing: number } }
type PetLooks = Pick<Pet, 'species' | 'stage' | 'form' | 'look'>
type Props = { leader: Leader; pet: PetLooks | null | undefined; reduced: boolean }

/** The knowledge pet trotting after the hero (nothing until an egg has hatched). */
export const PetFollower = ({ pet, ...rest }: Props) => (pet ? <PetBody pet={pet} {...rest} /> : null)

function PetBody({ leader, pet, reduced }: Props & { pet: PetLooks }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const pos = useRef({ x: leader.hero.pos.x, y: leader.hero.pos.y - 0.9 })
  const model = useMemo(() => buildPet(pet.species, pet.stage, pet.form, pet.look), [pet.species, pet.stage, pet.form, pet.look])
  useFrame((_, dt) => {
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const before = pos.current
    const next = followStep(before, leader.hero.pos, leader.hero.facing, dt)
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
