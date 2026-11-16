import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { MeshBasicMaterial, MeshStandardMaterial, type Mesh } from 'three'
import type { GameMap } from '../game/map'
import { THEMES } from './themes'
import { windTime } from './wind'

export const SEA_Y = -0.5
export const POND_Y = -0.15

/** Gentle rolling waves in the vertex shader; the shared wind clock drives them. */
export function waveMaterial(colour: string, amp: number) {
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

/** Connected patches of water tiles (bridges count as water underneath). Patches touching the map edge are part of the sea (a cove); others are ponds. */
export function waterRegions(map: GameMap) {
  const seen = new Set<string>()
  const out: { x: number; z: number; w: number; d: number; sea: boolean; tiles: number }[] = []
  map.cells.forEach((row, y0) =>
    row.forEach((c, x0) => {
      if (c.tile !== 'water' || seen.has(`${x0},${y0}`)) return
      let x1 = x0, y1 = y0, xa = x0, ya = y0, tiles = 0, sea = false
      const stack = [[x0, y0]]
      seen.add(`${x0},${y0}`)
      while (stack.length) {
        const [x, y] = stack.pop()!
        tiles++
        xa = Math.min(xa, x); ya = Math.min(ya, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
        if (x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1) sea = true
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${x + dx},${y + dy}`
          // Water runs on under bridges, so a bridge never splits a pond in two.
          if (['water', 'bridge'].includes(map.cells[y + dy]?.[x + dx]?.tile ?? '') && !seen.has(k)) {
            seen.add(k)
            stack.push([x + dx, y + dy])
          }
        }
      }
      out.push({ x: (xa + x1 + 1) / 2, z: (ya + y1 + 1) / 2, w: x1 - xa + 1, d: y1 - ya + 1, sea, tiles })
    }),
  )
  return out
}

export function Water({ map, sparkles }: { map: GameMap; sparkles: boolean }) {
  const look = THEMES[map.theme]
  const sea = useMemo(() => waveMaterial(look.water, 0.06), [look])
  const pond = useMemo(() => waveMaterial(look.pond, 0.025), [look])
  const foam = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), [])
  const foamRef = useRef<Mesh>(null)

  const regions = useMemo(() => waterRegions(map), [map])
  const biggestPond = useMemo(() => regions.filter((r) => !r.sea).sort((a, b) => b.tiles - a.tiles)[0], [regions])

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
      {regions
        .filter((r) => !r.sea)
        .map((r) => (
          <mesh key={`${r.x},${r.z}`} rotation={[-Math.PI / 2, 0, 0]} position={[r.x, POND_Y, r.z]} material={pond}>
            <planeGeometry args={[r.w, r.d, 16, 16]} />
          </mesh>
        ))}
      {sparkles && biggestPond && <Sparkles count={24} scale={[biggestPond.w, 0.4, biggestPond.d]} position={[biggestPond.x, POND_Y + 0.25, biggestPond.z]} size={4} speed={0.4} color="#ffffff" />}
      {sparkles && <Sparkles count={60} scale={[map.width + 16, 0.5, map.height + 16]} position={[cx, SEA_Y + 0.3, cz]} size={5} speed={0.3} color="#ffffff" />}
    </group>
  )
}
