import { seeThrough, seeThroughRadius } from './seeThrough'
import type { Pet } from '../features/pet/petRules'
import { PetFollower } from './pet/PetFollower'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Stats, useGLTF } from '@react-three/drei'
import { MeshBasicMaterial, RingGeometry, Vector3, type DirectionalLight, type Mesh, type PerspectiveCamera } from 'three'
import type { Appearance } from '../features/character/appearance'
import { areaAt, type GameMap } from '../game/map'
import { clearPlaceMaps } from '../game/placeMaps'
import { WorldSim } from '../game/sim'
import { useGame, worldPaused } from '../game/store'
import { screenOf } from '../game/screen'
import { Bosses, Hero, Monsters, Npcs } from './Actors'
import { Ground } from './Ground'
import { RIG_URL } from './hero/useRig'
import { listenKeys } from './input'
import { cameraOffset, DEFAULT_YAW, lookHeight, worldToGrid } from './projection'
import { useCamera } from './cameraStore'
import { clearProps, preloadProps, Props } from './Props'
import { createQualityMonitor } from './quality'
import { qualityLevel, useQuality } from './qualityStore'
import { Water } from './Water'
import { Decor } from './Decor'
import { THEMES } from './themes'
import { windTime } from './wind'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Called by the world's Retry button: forget failed downloads so they are fetched again. */
export function clearWorldCache() {
  clearProps()
  clearPlaceMaps()
  useGLTF.clear(RIG_URL)
}

const ringGeo = new RingGeometry(0.28, 0.4, 28).rotateX(-Math.PI / 2)
const ringMat = new MeshBasicMaterial({ color: '#fff6e3', transparent: true, depthWrite: false })

/** Runs the game each frame: input → WorldSim → store, camera follow, interact, the tap ring and auto quality. */
function Game({ sim, reduced }: { sim: WorldSim; reduced: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const setDpr = useThree((s) => s.setDpr)
  const sun = useRef<DirectionalLight>(null)
  const ring = useRef<Mesh>(null)
  const ringAt = useRef(-1)
  const target = useRef(new Vector3(sim.hero.pos.x, 0, sim.hero.pos.y))
  const lastEmit = useRef(0)
  const panelClosedAt = useRef(-Infinity)
  const monitor = useMemo(() => createQualityMonitor(), [])
  const level = useQuality(qualityLevel)

  useEffect(() => setDpr(level === 'low' ? Math.min(1.5, window.devicePixelRatio) : Math.min(2, window.devicePixelRatio)), [level, setDpr])

  useEffect(() => {
    const interact = () => {
      if (worldPaused() || performance.now() - panelClosedAt.current < 300) return
      const prompt = useGame.getState().prompt
      // The boatman opens the list of places to sail to; other villagers talk.
      if (prompt?.kind === 'npc') useGame.setState(prompt.id === 'boatman' ? { jetty: true } : prompt.id === 'teacher' ? { academy: 'code' } : prompt.id === 'linguist' ? { academy: 'language' } : { dialogue: { npc: prompt.id, page: 0 } })
      if (prompt?.kind === 'monster') useGame.setState({ battle: { monsterId: prompt.id, monster: prompt.monster, returning: prompt.returning } })
      if (prompt?.kind === 'boss') useGame.setState({ boss: prompt.id })
    }
    const keys = listenKeys(interact)
    keysRef.current = keys
    let seq = useGame.getState().interactSeq
    const unsub = useGame.subscribe((s, prev) => {
      // The key that closes a panel must not immediately reopen it.
      if ((prev.dialogue && !s.dialogue) || (prev.battle && !s.battle) || (prev.boss && !s.boss) || (prev.jetty && !s.jetty)) panelClosedAt.current = performance.now()
      if (s.interactSeq !== seq) {
        seq = s.interactSeq
        interact()
      }
    })
    // Wheel and two-finger pinch zoom within the Clash-style limits.
    const el = gl.domElement
    // Zoom is the player's saved camera setting (the store keeps it within its limits).
    const zoom = (d: number) => useCamera.getState().set({ distance: d })
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom(useCamera.getState().distance + e.deltaY * 0.01)
    }
    const touches = new Map<number, { x: number; y: number }>()
    let pinch = 0
    const spread = () => {
      const [a, b] = [...touches.values()]
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
    }
    const down = (e: PointerEvent) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) pinch = spread()
    }
    const move = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2 && pinch) {
        const now = spread()
        zoom(useCamera.getState().distance * (pinch / now))
        pinch = now
      }
    }
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      pinch = 0
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)

    screenOf.current = (p) => {
      const v = new Vector3(p.x, 0, p.y).project(camera)
      const r = el.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }
    // Development builds: lets automated tests click a grid point on the real canvas.
    if (import.meta.env.DEV) (window as unknown as { __world: unknown }).__world = { screenOf: screenOf.current }
    return () => {
      screenOf.current = null
      keys.stop()
      unsub()
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [camera, gl])
  const keysRef = useRef<ReturnType<typeof listenKeys> | null>(null)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const now = performance.now()
    windTime.value = reduced ? 0 : state.clock.elapsedTime
    const store = useGame.getState()
    if (store.defeated.length) {
      for (const id of store.defeated) sim.defeat(id, now)
      useGame.setState({ defeated: [] })
    }
    const view = useCamera.getState()
    const yaw = DEFAULT_YAW + (view.turn * Math.PI) / 2
    sim.cameraYaw = yaw
    const keys = keysRef.current?.read() ?? { x: 0, y: 0 }
    sim.update(dt, keys.x || keys.y ? keys : store.stick, now, worldPaused())

    const prompt = sim.prompt()
    if (store.prompt?.id !== prompt?.id) useGame.setState({ prompt })
    if (now - lastEmit.current > 150) {
      lastEmit.current = now
      const area = areaAt(sim.map, sim.hero.pos)
      useGame.setState({ player: { ...sim.hero.pos }, monsters: sim.monsters.filter((m) => m.alive).map((m) => ({ id: m.id, kind: m.kind, x: m.pos.x, y: m.pos.y })), ...(area !== store.area ? { area } : {}) })
    }

    // Camera eases after the hero (instantly under reduced motion), frame-rate independent.
    const goal = new Vector3(sim.hero.pos.x, lookHeight(view.tilt), sim.hero.pos.y)
    target.current.lerp(goal, reduced ? 1 : 1 - Math.pow(1 - 0.12, dt * 60))
    const [ox, oy, oz] = cameraOffset(view.distance, view.tilt, yaw)
    camera.position.set(target.current.x + ox, target.current.y + oy, target.current.z + oz)
    camera.lookAt(target.current)
    // Tell the scenery where the hero is, so whatever stands in front of them is cut away.
    const chest = new Vector3(sim.hero.pos.x, 0.8, sim.hero.pos.y)
    const depth = camera.position.distanceTo(chest)
    chest.project(camera)
    seeThrough.hero.value.set((chest.x + 1) / 2, (chest.y + 1) / 2)
    seeThrough.depth.value = depth
    seeThrough.radius.value = seeThroughRadius(depth, camera.fov)
    gl.getDrawingBufferSize(seeThrough.resolution.value)
    seeThrough.aspect.value = seeThrough.resolution.value.x / Math.max(1, seeThrough.resolution.value.y)
    if (camera.fov !== view.fov) {
      camera.fov = view.fov
      camera.updateProjectionMatrix()
    }
    if (sun.current) {
      // Light from the upper left of the screen (−x), so shadows fall toward the viewer and stay visible.
      sun.current.position.set(target.current.x - 9, 15, target.current.z + 5)
      sun.current.target.position.copy(target.current)
      sun.current.target.updateMatrixWorld()
    }

    if (ring.current) {
      const t = (now - ringAt.current) / 600
      ring.current.visible = ringAt.current > 0 && t < 1
      ring.current.scale.setScalar(reduced ? 1 : 0.6 + t * 0.6)
      ringMat.opacity = 0.9 * (1 - t)
    }

    if (useQuality.getState().choice === 'auto' && useQuality.getState().auto === 'high' && monitor.sample(delta * 1000) === 'low') useQuality.setState({ auto: 'low' })
  })

  const tap = (e: ThreeEvent<PointerEvent>) => {
    if (!e.nativeEvent.isPrimary || worldPaused()) return
    const g = worldToGrid(e.point.x, e.point.z)
    sim.tap(g)
    ringAt.current = performance.now()
    ring.current?.position.set(Math.floor(g.x) + 0.5, 0.02, Math.floor(g.y) + 0.5)
  }

  return (
    <>
      <hemisphereLight args={['#bfe6ff', '#8bc34a', 1.15]} />
      <directionalLight ref={sun} color="#fff1d6" intensity={2.4} castShadow={level === 'high'} shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-far={50} shadow-bias={-0.0006} />
      {/* The tap target: an invisible floor over the whole island. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[sim.map.width / 2, 0.001, sim.map.height / 2]} onPointerDown={tap} visible={false}>
        <planeGeometry args={[sim.map.width, sim.map.height]} />
      </mesh>
      <mesh ref={ring} geometry={ringGeo} material={ringMat} visible={false} />
    </>
  )
}

/** One place in 3D. Default export so it loads as its own chunk with three.js. */
export default function World3D({ hero, pet, returning = 0, map, atArrival = false, startAt }: { hero: Appearance; pet?: Pet | null; returning?: number; map: GameMap; atArrival?: boolean; startAt?: { x: number; y: number } }) {
  const sim = useMemo(() => {
    const s = new WorldSim(map, Math.random, { atArrival, start: startAt })
    // Development only: /dev/world?at=x,y starts the hero on that tile (for screenshots).
    const at = import.meta.env.DEV ? new URLSearchParams(location.search).get('at')?.split(',').map(Number) : undefined
    if (at?.length === 2 && at.every(Number.isFinite)) s.hero.pos = { x: at[0] + 0.5, y: at[1] + 0.5 }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the start spot is read once, when the place opens
  }, [map, atArrival])
  // Due topics can arrive after the world has opened: top the Returning monsters up and redraw.
  const [, redraw] = useState(0)
  useEffect(() => {
    sim.addReturning(returning)
    redraw((n) => n + 1)
  }, [sim, returning])
  const look = THEMES[map.theme]
  const covered = useGame((s) => Boolean(s.battle || s.boss))
  const level = useQuality(qualityLevel)
  const reduced = useMemo(reducedMotion, [])
  useEffect(preloadProps, [])
  const view = useCamera.getState()
  const start = cameraOffset(view.distance, view.tilt, DEFAULT_YAW + (view.turn * Math.PI) / 2)

  return (
    <Canvas
      // Battle panels cover the world: stop drawing it to save battery and keep phones responsive.
      frameloop={covered ? 'never' : 'always'}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: view.fov, near: 0.5, far: 150, position: [sim.hero.pos.x + start[0], start[1], sim.hero.pos.y + start[2]] }}
    >
      <color attach="background" args={[look.sky]} />
      <fog attach="fog" args={[look.sky, ...look.fog]} />
      <Game sim={sim} reduced={reduced} />
      <Ground map={map} />
      <Water map={map} sparkles={level === 'high' && !reduced} />
      <Props map={map} shadows={level === 'high'} />
      <Decor map={map} fancy={level === 'high' && !reduced} />
      <Npcs sim={sim} reduced={reduced} />
      <Monsters sim={sim} reduced={reduced} />
      <Bosses sim={sim} reduced={reduced} />
      <Hero sim={sim} appearance={hero} reduced={reduced} />
      <PetFollower sim={sim} pet={pet} reduced={reduced} />
      {import.meta.env.DEV && location.search.includes('fps') && <Stats />}
    </Canvas>
  )
}
