import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { MeshBasicMaterial, MeshStandardMaterial, type Mesh } from 'three'
import type { GameMap } from '../game/map'
import { windTime } from './wind'

export const SEA_Y = -0.5
export const POND_Y = -0.15

/** Gentle rolling waves in the vertex shader; the shared wind clock drives them. */
function waveMaterial(colour: string, amp: number) {
  const m = new MeshStandardMaterial({ color: colour, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.93 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nvarying float vWave;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  float w = sin(position.x * 0.9 + uWindTime * 1.4) * 0.5 + sin(position.y * 1.3 - uWindTime * 1.1) * 0.5;
  transformed.z += w * ${amp.toFixed(3)};
  vWave = w;`,
      )
    // Crests catch a little extra light, so the moving waves read even from far away.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWave;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.rgb += smoothstep(0.55, 1.0, vWave) * 0.12;')
  }
  m.customProgramCacheKey = () => `wave-${amp}`
  return m
}

export function Water({ map, sparkles }: { map: GameMap; sparkles: boolean }) {
  const sea = useMemo(() => waveMaterial('#4fb0dd', 0.06), [])
  const pond = useMemo(() => waveMaterial('#6cc4f0', 0.025), [])
  const foam = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), [])
  const foamRef = useRef<Mesh>(null)

  const pondBox = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    map.cells.forEach((row, y) => row.forEach((c, x) => c.tile === 'water' && ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x + 1)), (y1 = Math.max(y1, y + 1)))))
    return Number.isFinite(x0) ? { x: (x0 + x1) / 2, z: (y0 + y1) / 2, w: x1 - x0, d: y1 - y0 } : null
  }, [map])

  useFrame(() => {
    // Foam breathes in and out around the shore.
    const t = windTime.value
    foam.opacity = 0.35 + Math.sin(t * 1.2) * 0.15
    if (foamRef.current) foamRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.008)
  })

  const cx = map.width / 2
  const cz = map.height / 2
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, SEA_Y, cz]} material={sea} receiveShadow>
        <planeGeometry args={[220, 220, 90, 90]} />
      </mesh>
      <mesh ref={foamRef} rotation={[-Math.PI / 2, 0, 0]} position={[cx, SEA_Y + 0.05, cz]} material={foam}>
        <ringGeometry args={[map.width * 0.705, map.width * 0.74, 4, 1, Math.PI / 4]} />
      </mesh>
      {pondBox && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pondBox.x, POND_Y, pondBox.z]} material={pond}>
            <planeGeometry args={[pondBox.w, pondBox.d, 16, 16]} />
          </mesh>
          {sparkles && <Sparkles count={24} scale={[pondBox.w, 0.4, pondBox.d]} position={[pondBox.x, POND_Y + 0.25, pondBox.z]} size={4} speed={0.4} color="#ffffff" />}
        </>
      )}
      {sparkles && <Sparkles count={60} scale={[map.width + 16, 0.5, map.height + 16]} position={[cx, SEA_Y + 0.3, cz]} size={5} speed={0.3} color="#ffffff" />}
    </group>
  )
}
