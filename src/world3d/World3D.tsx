import { HarvestNodes } from './HarvestNodes'
import { twoFinger } from './gestures'
import { playSfx } from '../audio/engine'
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
import { useGame, worldPaused, type Prompt } from '../game/store'
import { screenOf } from '../game/screen'
import { Bosses, Hero, Monsters, Npcs } from './Actors'
import { Ground } from './Ground'
import { RIG_URL } from './hero/useRig'
import { listenKeys } from './input'
import { cameraOffset, DEFAULT_YAW, lookHeight, worldToGrid } from './projection'
import { useCamera } from './cameraStore'
import { clearProps, preloadProps, Props } from './Props'
import { qualityLevel, sampleAutoQuality, useQuality } from './qualityStore'
import { Water } from './Water'
import { Decor } from './Decor'
import { FestivalDecor } from './FestivalDecor'
import { OtherPlayers } from './OtherPlayers'
import { useRoomConnection } from '../features/multiplayer/useRoom'
import { decoratedKinds } from './props/festivalProps'
import type { FestivalKind } from '../features/festival/festivalRules'
import { THEMES } from './themes'
import { windGust, windTime } from './wind'
import { Lively } from './Lively'
import { SlashChips } from './SlashChips'
import { isPrivatePlace } from '../game/places'
import { IslandItems } from './IslandItems'
import { blockedTiles, type Placed } from '../features/island/rules'
import { BuildGhost } from './BuildGhost'
import { isBuildTap } from './buildTap'
import { DefeatBurst } from './DefeatBurst'
import { defeatBurst, facingToward, FINISHER, finisherCamera } from './finisher'

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
  const buildDown = useRef<{ x: number; y: number; multi: boolean } | null>(null)
  const lastEmit = useRef(0)
  const lastStep = useRef(0)
  const panelClosedAt = useRef(-Infinity)
  const beats = useRef({ startedAt: -1, attack: false, impact: false, cheer: false }) // cutscene moments already played
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
      if (prompt?.kind === 'harvest') useGame.setState((s) => ({ slashReq: { x: prompt.x, y: prompt.y, material: prompt.material, seq: (s.slashReq?.seq ?? 0) + 1 } }))
      if (prompt?.kind === 'workbench') useGame.setState({ workbench: true })
      if (prompt?.kind === 'board') useGame.setState({ board: true })
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
    // Two fingers: pinch to zoom, twist to turn, slide up or down to tilt. Right mouse drag turns and tilts too.
    const touches = new Map<number, { x: number; y: number }>()
    let dragging = false
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button === 2) dragging = true
      if (e.pointerType !== 'mouse') touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      // A second finger turns a pending build tap into a camera gesture.
      if (touches.size >= 2 && buildDown.current) buildDown.current.multi = true
    }
    const move = (e: PointerEvent) => {
      if (dragging) {
        useCamera.getState().orbit(e.movementX * 0.35, e.movementY * 0.2)
        return
      }
      if (!touches.has(e.pointerId)) return
      const before = [...touches.values()]
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size !== 2) return
      const [a1, b1] = [...touches.values()]
      const g = twoFinger(before[0], before[1], a1, b1)
      zoom(useCamera.getState().distance * g.scale)
      useCamera.getState().orbit(-g.yawDeg, g.panY * 0.15)
    }
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') dragging = false
      touches.delete(e.pointerId)
    }
    const noMenu = (e: Event) => e.preventDefault() // right-drag turns the camera instead
    el.addEventListener('contextmenu', noMenu)
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
      el.removeEventListener('contextmenu', noMenu)
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
    windGust.value = level === 'high' && !reduced ? 1 : 0
    const store = useGame.getState()
    if (store.defeated.length) {
      for (const id of store.defeated) sim.defeat(id, now)
      useGame.setState({ defeated: [] })
    }
    // Z / X turn the camera, R / F tilt it, while held.
    const camKeys = keysRef.current?.readCamera()
    if (camKeys && (camKeys.yaw || camKeys.tilt)) useCamera.getState().orbit(camKeys.yaw * 90 * dt, camKeys.tilt * 40 * dt)
    const view = useCamera.getState()
    const yaw = DEFAULT_YAW + (view.yaw * Math.PI) / 180
    sim.cameraYaw = yaw
    const keys = keysRef.current?.read() ?? { x: 0, y: 0 }
    sim.update(dt, keys.x || keys.y ? keys : store.stick, now, worldPaused())

    // Soft footsteps while walking.
    if (sim.hero.speed01 > 0.3 && now - lastStep.current > 330) {
      lastStep.current = now
      playSfx('step')
    }

    const prompt = sim.prompt()
    if (promptKey(store.prompt) !== promptKey(prompt)) useGame.setState({ prompt })
    if (now - lastEmit.current > 150) {
      lastEmit.current = now
      const area = areaAt(sim.map, sim.hero.pos)
      useGame.setState({ player: { ...sim.hero.pos }, monsters: sim.monsters.filter((m) => m.alive).map((m) => ({ id: m.id, kind: m.kind, x: m.pos.x, y: m.pos.y })), ...(area !== store.area ? { area } : {}) })
    }

    // The defeat cutscene (finisher.ts): the hero turns and strikes, the monster bursts, the camera swoops in and shakes.
    const shot = { distance: view.distance, tilt: view.tilt, yaw, shake: 0 }
    const goal = new Vector3(sim.hero.pos.x, lookHeight(view.tilt), sim.hero.pos.y)
    const fin = store.finisher
    const foe = fin && sim.monsters.find((m) => m.id === fin.monsterId)
    if (fin && foe) {
      const t = now - fin.startedAt
      if (beats.current.startedAt !== fin.startedAt) beats.current = { startedAt: fin.startedAt, attack: false, impact: false, cheer: false }
      const b = beats.current
      sim.hero.facing = facingToward(sim.hero.pos, foe.pos)
      if (foe.alive) foe.facing = facingToward(foe.pos, sim.hero.pos)
      if (!b.attack && t >= FINISHER.attackAt) {
        b.attack = true
        useGame.setState((s) => ({ slashSeq: s.slashSeq + 1 }))
        playSfx('chop')
      }
      if (!b.impact && t >= FINISHER.impactAt) {
        b.impact = true
        sim.defeat(foe.id, now)
        Object.assign(defeatBurst, { at: now, x: foe.pos.x, z: foe.pos.y })
        playSfx('sparkle')
      }
      if (!b.cheer && t >= FINISHER.cheerAt) {
        b.cheer = true
        useGame.setState((s) => ({ cheerSeq: s.cheerSeq + 1 }))
      }
      const c = finisherCamera(t, view, yaw, sim.hero.pos, foe.pos)
      Object.assign(shot, { distance: c.distance, tilt: c.tilt, yaw: c.yaw, shake: c.shake })
      goal.set((sim.hero.pos.x + foe.pos.x) / 2, lookHeight(c.tilt), (sim.hero.pos.y + foe.pos.y) / 2)
    }

    // Camera eases after the hero (instantly under reduced motion), frame-rate independent.
    target.current.lerp(goal, reduced ? 1 : 1 - Math.pow(1 - 0.12, dt * 60))
    const [ox, oy, oz] = cameraOffset(shot.distance, shot.tilt, shot.yaw)
    const jolt = shot.shake * 0.18
    const [jx, jy] = [(Math.random() - 0.5) * jolt, (Math.random() - 0.5) * jolt]
    camera.position.set(target.current.x + ox + jx, target.current.y + oy + jy, target.current.z + oz)
    camera.lookAt(target.current.x + jx, target.current.y + jy, target.current.z)
    // Tell the scenery where the hero is, so whatever stands in front of them is cut away.
    // In the defeat cutscene the cut-away is centred on the pair and wide enough for both.
    const pair = Boolean(fin && foe)
    const chest = pair ? new Vector3(goal.x, 0.8, goal.z) : new Vector3(sim.hero.pos.x, 0.8, sim.hero.pos.y)
    const depth = camera.position.distanceTo(chest)
    chest.project(camera)
    seeThrough.hero.value.set((chest.x + 1) / 2, (chest.y + 1) / 2)
    seeThrough.depth.value = depth
    seeThrough.radius.value = Math.min(0.45, seeThroughRadius(depth, camera.fov) * (pair ? 1.8 : 1))
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

    // Auto: down a level when frames stay slow, up to High once on a smooth laptop (qualityStore.ts).
    sampleAutoQuality(delta * 1000)
  })

  // A laptop pointer shows where the item would go (only while building, and only when the tile changes).
  const hover = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.pointerType !== 'mouse' || !useGame.getState().build.open) return
    const g = worldToGrid(e.point.x, e.point.z)
    const x = Math.floor(g.x)
    const y = Math.floor(g.y)
    const h = useGame.getState().buildHover
    if (!h || h.x !== x || h.y !== y) useGame.setState({ buildHover: { x, y } })
  }
  // Only a clean tap builds (not a drag, pinch or twist of the camera).
  const buildUp = (e: ThreeEvent<PointerEvent>) => {
    const start = buildDown.current
    buildDown.current = null
    if (!useGame.getState().build.open || !isBuildTap(start, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })) return
    const g = worldToGrid(e.point.x, e.point.z)
    // The counter only ever grows: the panel clears the tap after a placement, and a reused number would be ignored.
    useGame.setState({ buildTap: { x: Math.floor(g.x), y: Math.floor(g.y), seq: ++buildTaps } })
  }
  const tap = (e: ThreeEvent<PointerEvent>) => {
    // Only a left click or a single finger walks; the right button turns the camera.
    if (!e.nativeEvent.isPrimary || e.nativeEvent.button !== 0 || worldPaused()) return
    const g = worldToGrid(e.point.x, e.point.z)
    // Building on My island: a tap places (or picks up) instead of walking, decided when the finger lifts.
    if (useGame.getState().build.open) {
      buildDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, multi: false }
      return
    }
    sim.tap(g)
    ringAt.current = performance.now()
    ring.current?.position.set(Math.floor(g.x) + 0.5, 0.02, Math.floor(g.y) + 0.5)
  }

  return (
    <>
      <hemisphereLight args={['#bfe6ff', '#8bc34a', 1.15]} />
      <directionalLight ref={sun} color="#fff1d6" intensity={2.4} castShadow={level !== 'low'} shadow-radius={level === 'high' ? 4 : 1} shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-far={50} shadow-bias={-0.0006} />
      {/* The tap target: an invisible floor over the whole island. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[sim.map.width / 2, 0.001, sim.map.height / 2]} onPointerDown={tap} onPointerUp={buildUp} onPointerMove={hover} visible={false}>
        <planeGeometry args={[sim.map.width, sim.map.height]} />
      </mesh>
      <mesh ref={ring} geometry={ringGeo} material={ringMat} visible={false} />
    </>
  )
}

/** One place in 3D. Default export so it loads as its own chunk with three.js. */
const NONE = new Set<string>()
let buildTaps = 0
const NO_ITEMS: Placed[] = []

/** Identity of a prompt, so the store only changes when the thing nearby changes. */
const promptKey = (p: Prompt | null) => (!p ? '' : p.kind === 'harvest' ? `harvest:${p.x},${p.y}` : p.kind === 'workbench' || p.kind === 'board' ? p.kind : `${p.kind}:${p.id}`)

const NO_FESTIVALS: FestivalKind[] = []

export default function World3D({ hero, pet, returning = 0, regrowing = NONE, built = NONE, festivals = NO_FESTIVALS, map, atArrival = false, startAt, island = NO_ITEMS }: { hero: Appearance; pet?: Pet | null; returning?: number; regrowing?: Set<string>; built?: Set<string>; festivals?: FestivalKind[]; map: GameMap; atArrival?: boolean; startAt?: { x: number; y: number }; island?: Placed[] }) {
  const sim = useMemo(() => {
    const s = new WorldSim(map, Math.random, { atArrival, start: startAt })
    // Development only: /dev/world?at=x,y starts the hero on that tile (for screenshots).
    const at = import.meta.env.DEV ? new URLSearchParams(location.search).get('at')?.split(',').map(Number) : undefined
    if (at?.length === 2 && at.every(Number.isFinite)) s.hero.pos = { x: at[0] + 0.5, y: at[1] + 0.5 }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the start spot is read once, when the place opens
  }, [map, atArrival])
  // Regrowing harvest nodes offer nothing until they are ready again.
  useEffect(() => {
    sim.regrowing = regrowing
  }, [sim, regrowing])
  // Things built on My island block walking as soon as they are placed.
  useEffect(() => {
    sim.extraBlocked = blockedTiles(island)
  }, [sim, island])
  // Due topics can arrive after the world has opened: top the Returning monsters up and redraw.
  const [, redraw] = useState(0)
  useEffect(() => {
    sim.addReturning(returning)
    redraw((n) => n + 1)
  }, [sim, returning])
  const look = THEMES[map.theme]
  const festive = useMemo(() => decoratedKinds(map.id, festivals), [map.id, festivals])
  const room = useRoomConnection(isPrivatePlace(map.id) ? null : map.id)
  // A battle panel covers the world (except while the defeat cutscene plays on it), and so does the turn-your-phone screen.
  const covered = useGame((s) => Boolean((s.battle && !s.finisher) || s.boss || s.upright))
  const level = useQuality(qualityLevel)
  const reduced = useMemo(reducedMotion, [])
  useEffect(preloadProps, [])
  const view = useCamera.getState()
  const start = cameraOffset(view.distance, view.tilt, DEFAULT_YAW + (view.yaw * Math.PI) / 180)

  return (
    <>
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
      <Ground map={map} lush={level === 'high'} />
      <Water map={map} sparkles={level !== 'low' && !reduced} />
      <Props map={map} shadows={level !== 'low'} />
      <HarvestNodes map={map} regrowing={regrowing} built={built} shadows={level !== 'low'} />
      {island.length > 0 && <IslandItems items={island} shadows={level !== 'low'} />}
      {isPrivatePlace(map.id) && <BuildGhost items={island} />}
      {!reduced && <SlashChips />}
      {!reduced && <DefeatBurst />}
      <Decor map={map} fancy={level !== 'low' && !reduced} />
      {level === 'high' && !reduced && <Lively map={map} />}
      <FestivalDecor map={map} kinds={festive} fancy={level !== 'low' && !reduced} shadows={level !== 'low'} />
      <Npcs sim={sim} reduced={reduced} />
      <Monsters sim={sim} reduced={reduced} />
      <Bosses sim={sim} reduced={reduced} />
      <Hero sim={sim} appearance={hero} reduced={reduced} />
      <PetFollower leader={sim} pet={pet} reduced={reduced} />
      <OtherPlayers sim={sim} client={room} reduced={reduced} lowQuality={level === 'low'} />
      {import.meta.env.DEV && location.search.includes('fps') && <Stats />}
    </Canvas>
    {/* High graphics: a soft vignette draws the eye to the middle, like a camera lens. */}
    {level === 'high' && <div aria-hidden className="world-vignette pointer-events-none absolute inset-0" />}
    </>
  )
}
