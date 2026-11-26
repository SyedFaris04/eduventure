import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { CanvasTexture, CircleGeometry, Color, DoubleSide, MeshBasicMaterial, Object3D, PlaneGeometry, type Group, type InstancedMesh } from 'three'
import type { GameMap, Theme } from '../game/map'
import { butterflyAt, butterflyHomes, cloudAt } from './livelyMotion'
import { windTime } from './wind'

const CLOUDS = 7

/** A soft, puffy cloud shadow: overlapping round puffs of cool shade on a transparent canvas. */
function cloudTexture(): CanvasTexture | null {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  if (!g) return null
  for (const [x, y, r] of [[64, 64, 40], [40, 58, 26], [88, 60, 28], [60, 40, 24], [70, 86, 26], [96, 80, 20], [34, 80, 20]]) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(20, 40, 70, 0.55)')
    grad.addColorStop(1, 'rgba(20, 40, 70, 0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  }
  return new CanvasTexture(c)
}

/** Shadows of clouds drifting across the island (the camera looks down, so their shade is what shows of them). */
function CloudShadows({ map }: { map: GameMap }) {
  const group = useRef<Group>(null)
  const mat = useMemo(() => new MeshBasicMaterial({ map: cloudTexture(), transparent: true, opacity: 0.5, depthWrite: false, fog: false, toneMapped: false }), [])
  const geo = useMemo(() => new PlaneGeometry(2, 2).rotateX(-Math.PI / 2), [])
  useFrame(() => {
    group.current?.children.forEach((m, i) => {
      const c = cloudAt(i, windTime.value, map.width, map.height)
      m.position.set(c.x, 0.06, c.z) // just above the ground and ponds, under everything standing on them
      m.scale.setScalar(c.size)
    })
  })
  useLayoutEffect(
    () => () => {
      mat.map?.dispose()
      mat.dispose()
      geo.dispose()
    },
    [mat, geo],
  )
  return (
    <group ref={group}>
      {Array.from({ length: CLOUDS }, (_, i) => (
        <mesh key={i} geometry={geo} material={mat} rotation={[0, i * 1.3, 0]} renderOrder={10} />
      ))}
    </group>
  )
}

const WING_COLOURS = ['#ff8c1a', '#ffd21f', '#ff5fa2', '#3d8bff', '#b26bff', '#ff4d4d']

/** Butterflies fluttering around the flower patches: two wings each, flapping, turned the way they fly. */
function Butterflies({ map }: { map: GameMap }) {
  const homes = useMemo(() => butterflyHomes(map), [map])
  const flock = useMemo(() => homes.flatMap((h, k) => (k % 2 ? [h] : [h, h])), [homes])
  const left = useRef<InstancedMesh>(null)
  const right = useRef<InstancedMesh>(null)
  const geo = useMemo(() => {
    // A rounded wing, a little longer than wide, hinged at the body.
    const wing = new CircleGeometry(0.15, 8).rotateX(-Math.PI / 2).scale(1, 1, 1.3)
    return { left: wing.clone().translate(-0.15, 0, 0), right: wing.translate(0.15, 0, 0) }
  }, [])
  // Unlit, so the colours stay bright against the grass from the game's distance.
  const mat = useMemo(() => new MeshBasicMaterial({ side: DoubleSide, toneMapped: false }), [])
  useLayoutEffect(() => {
    const c = new Color()
    flock.forEach((_, i) => {
      left.current?.setColorAt(i, c.set(WING_COLOURS[i % WING_COLOURS.length]))
      right.current?.setColorAt(i, c)
    })
    for (const m of [left.current, right.current]) if (m?.instanceColor) m.instanceColor.needsUpdate = true
  }, [flock])
  const o = useMemo(() => new Object3D(), [])
  useFrame(() => {
    const t = windTime.value
    flock.forEach((home, i) => {
      const p = butterflyAt(home, i, t)
      const ahead = butterflyAt(home, i, t + 0.05)
      const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z)
      const flap = 0.25 + 0.95 * (0.5 + 0.5 * Math.sin(t * 16 + i * 2.1))
      for (const [mesh, sign] of [[right.current, 1], [left.current, -1]] as const) {
        if (!mesh) continue
        o.position.set(p.x, p.y, p.z)
        o.rotation.set(0, yaw, sign * flap, 'YZX')
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
        mesh.instanceMatrix.needsUpdate = true
      }
    })
  })
  if (!flock.length) return null
  return (
    <>
      <instancedMesh ref={left} args={[geo.left, mat, flock.length]} frustumCulled={false} />
      <instancedMesh ref={right} args={[geo.right, mat, flock.length]} frustumCulled={false} />
    </>
  )
}

/** Pollen drifting in the sunlight; fireflies in the rainforest and the tech island. The snowy mountain has its snow. */
const MOTES: Partial<Record<Theme, { color: string; size: number }>> = {
  kampung: { color: '#fff4c2', size: 5 },
  rainforest: { color: '#d9ff8a', size: 7 },
  kingdom: { color: '#ffe6a0', size: 5 },
  tech: { color: '#8ff9ff', size: 6 },
}

/** High graphics' living extras (decision #54); off under reduced motion. */
export function Lively({ map }: { map: GameMap }) {
  const motes = MOTES[map.theme]
  return (
    <>
      <CloudShadows map={map} />
      <Butterflies map={map} />
      {motes && <Sparkles count={160} scale={[map.width, 2.5, map.height]} position={[map.width / 2, 1.4, map.height / 2]} size={motes.size} speed={0.25} opacity={0.7} color={motes.color} />}
    </>
  )
}
