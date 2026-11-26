import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry, MeshBasicMaterial, type Group, type Mesh, type Material } from 'three'
import type { Appearance } from '../features/character/appearance'
import { INTERACT_RANGE } from '../game/movement'
import { NPCS } from '../game/npcs'
import type { SimMonster, WorldSim } from '../game/sim'
import { useGame } from '../game/store'
import { HeroModel, type OneShot } from './hero/HeroModel'
import { useLatestReaction } from './hero/reaction'
import { buildMonster, buildReturningMarker } from './monsters/buildMonster'
import { monsterMotion } from './monsters/motion'

export const HERO_SCALE = 0.56 // the rig is ~2.3 units tall; heroes stand about 1.3 tiles, big enough to read on a phone
const shadowGeo = new CircleGeometry(0.5, 20).rotateX(-Math.PI / 2)
const shadowMat = new MeshBasicMaterial({ color: '#1d3a12', transparent: true, opacity: 0.22, depthWrite: false })
/** A soft round shadow under every actor; it reads even with real shadows off on low quality. */
export const Blob = ({ size }: { size: number }) => <mesh geometry={shadowGeo} material={shadowMat} position={[0, 0.012, 0]} scale={size} />

// Turn toward an angle the short way round.
export const turnToward = (from: number, to: number, k: number) => {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + d * k
}

export function Hero({ sim, appearance, reduced }: { sim: WorldSim; appearance: Appearance; reduced: boolean }) {
  const ref = useRef<Group>(null)
  const speed = useMemo(() => ({ get current() { return sim.hero.speed01 } }), [sim])
  const hitSeq = useGame((s) => s.hitSeq)
  const cheerSeq = useGame((s) => s.cheerSeq)
  const slashSeq = useGame((s) => s.slashSeq)
  const oneShot = useLatestReaction(hitSeq, cheerSeq, slashSeq)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.position.set(sim.hero.pos.x, 0, sim.hero.pos.y)
    const body = g.children[1] as Group | undefined
    if (body) body.rotation.y = reduced ? sim.hero.facing : turnToward(body.rotation.y, sim.hero.facing, Math.min(1, dt * 12))
  })
  return (
    <group ref={ref}>
      <Blob size={0.7} />
      <group scale={HERO_SCALE}>
        <HeroModel appearance={appearance} speed={speed} oneShot={oneShot} reducedMotion={reduced} />
      </group>
    </group>
  )
}

/** Villagers face the camera and wave once when the hero walks up. */
export function Npcs({ sim, reduced }: { sim: WorldSim; reduced: boolean }) {
  return (
    <>
      {sim.map.npcs.map((n) => (
        <Npc key={n.id} id={n.id} x={n.x + 0.5} z={n.y + 0.5} sim={sim} reduced={reduced} />
      ))}
    </>
  )
}

function Npc({ id, x, z, sim, reduced }: { id: keyof typeof NPCS; x: number; z: number; sim: WorldSim; reduced: boolean }) {
  const near = useRef(false)
  const [wave, setWave] = useState<OneShot | null>(null)
  useFrame(() => {
    const d = Math.hypot(sim.hero.pos.x - x, sim.hero.pos.y - z)
    const inRange = d <= INTERACT_RANGE + 0.5
    if (inRange && !near.current) setWave((w) => ({ action: 'wave', seq: (w?.seq ?? 0) + 1 }))
    near.current = inRange
  })
  return (
    <group position={[x, 0, z]}>
      <Blob size={0.7} />
      <group scale={HERO_SCALE} rotation={[0, Math.PI / 4, 0]}>
        <HeroModel appearance={NPCS[id].appearance} oneShot={wave} reducedMotion={reduced} />
      </group>
    </group>
  )
}

export function Monsters({ sim, reduced }: { sim: WorldSim; reduced: boolean }) {
  return (
    <>
      {sim.monsters.map((m, i) => (
        <MonsterActor key={m.id} m={m} seed={i * 0.37} reduced={reduced} />
      ))}
    </>
  )
}

function MonsterActor({ m, seed, reduced }: { m: SimMonster; seed: number; reduced: boolean }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const model = useMemo(() => buildMonster(m.kind), [m.kind])
  const marker = useMemo(() => (m.returning ? buildReturningMarker() : null), [m.returning])
  const seen = useRef({ alive: m.alive, poofFrom: -1, popFrom: -1, poofMs: 500 })
  // Each monster fades on its own, so its materials are copies (the shared ones stay opaque elsewhere).
  const fadeMats = useMemo(() => {
    const mats: Material[] = []
    model.traverse((o) => {
      const mesh = o as Mesh
      if (mesh.isMesh) {
        mesh.material = (mesh.material as Material).clone()
        mesh.material.transparent = true
        mats.push(mesh.material)
      }
    })
    return mats
  }, [model])

  useFrame(() => {
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const now = performance.now()
    const s = seen.current
    if (s.alive && !m.alive) {
      s.poofFrom = now
      s.poofMs = useGame.getState().finisher?.monsterId === m.id ? 1100 : 500 // slow motion in the defeat cutscene
    }
    if (!s.alive && m.alive) s.popFrom = now
    s.alive = m.alive
    r.position.set(m.pos.x, 0, m.pos.y)
    b.rotation.y = m.facing
    let motion = monsterMotion('idle', reduced ? 0 : (now / 1600) % 1, seed)
    let scale = 1
    if (!m.alive) {
      const t = (now - s.poofFrom) / s.poofMs
      motion = monsterMotion('poof', reduced ? 1 : t, seed)
      r.visible = t < 1 && !reduced
    } else {
      r.visible = true
      if (m.hopT >= 0) motion = monsterMotion('hop', m.hopT, seed)
      const pop = (now - s.popFrom) / 300
      if (s.popFrom > 0 && pop < 1 && !reduced) scale = 1 - (1 - pop) ** 3 // ease out from nothing
    }
    b.position.y = motion.y
    b.scale.set(motion.sx * scale, motion.sy * scale, motion.sz * scale)
    for (const mat of fadeMats) mat.opacity = motion.opacity
    if (marker && !reduced) marker.rotation.y = now / 900
  })
  useEffect(() => () => fadeMats.forEach((mm) => mm.dispose()), [fadeMats])
  return (
    <group ref={root}>
      <Blob size={0.75} />
      {marker && <primitive object={marker} />}
      <group ref={body}>
        <primitive object={model} />
      </group>
    </group>
  )
}

export function Bosses({ sim, reduced }: { sim: WorldSim; reduced: boolean }) {
  const boss = sim.map.bosses[0]
  const model = useMemo(() => buildMonster(boss?.id ?? 'guardian'), [boss?.id])
  const body = useRef<Group>(null)
  useFrame(() => {
    if (!body.current) return
    const m = monsterMotion('idle', reduced ? 0 : (performance.now() / 2400) % 1, 0.2)
    body.current.scale.set(m.sx * 0.75, m.sy * 0.75, m.sz * 0.75)
  })
  if (!boss) return null
  return (
    <group position={[boss.x + 0.5, 0, boss.y + 0.5]} rotation={[0, Math.PI / 4, 0]}>
      <Blob size={1.6} />
      <group ref={body}>
        <primitive object={model} />
      </group>
    </group>
  )
}
