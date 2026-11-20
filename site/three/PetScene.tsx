import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { buildPet, PET_SCALE } from '../../src/world3d/pet/buildPet'
import { PET_SPECIES } from '../../src/features/pet/petRules'
import type { PetStage } from '../Still'

function Pet({ stage }: { stage: PetStage }) {
  const model = useMemo(() => (stage === 'egg' ? null : buildPet(PET_SPECIES[0], stage, stage === 'adult' ? 'science' : null, {})), [stage])
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.6
      ref.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2)) * 0.06
    }
  })
  if (!model)
    return (
      <group ref={ref}>
        <mesh position={[0, 0.45, 0]} scale={[0.8, 1, 0.8]}>
          <sphereGeometry args={[0.45, 32, 24]} />
          <meshStandardMaterial color="#fff6e3" />
        </mesh>
      </group>
    )
  // Stage sizes as in the game, with the adult filling the frame.
  return (
    <group ref={ref} scale={PET_SCALE[stage as Exclude<PetStage, 'egg'>] / PET_SCALE.adult}>
      <primitive object={model} />
    </group>
  )
}

/** The game's knowledge pet at a stage (an egg first). */
export default function PetScene({ stage, active }: { stage: PetStage; active: boolean }) {
  return (
    <Canvas dpr={[1, 2]} frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0.9, 3], fov: 35 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <group position={[0, -0.4, 0]}>
        <Pet stage={stage} />
      </group>
    </Canvas>
  )
}
