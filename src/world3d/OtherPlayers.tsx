import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useTranslation } from 'react-i18next'
import type { Group } from 'three'
import type { Appearance } from '../features/character/appearance'
import { EMOTE_ICON, useRoom, type Emote, type OtherPlayer } from '../features/multiplayer/useRoom'
import type { RoomClient } from '../features/multiplayer/roomClient'
import type { WorldSim } from '../game/sim'
import { useGame } from '../game/store'
import { Blob, HERO_SCALE, turnToward } from './Actors'
import { HeroModel } from './hero/HeroModel'
import { PetFollower, type Leader } from './pet/PetFollower'
import { faceToward, glide } from './glide'

const BUBBLE_MS = 3000
const WALK_SPEED = 3.2

/** True for the few seconds after a player's latest emote. */
function useBubble(id: string | null): Emote | null {
  const latest = useRoom((s) => (id ? s.emotes[id] : undefined))
  const [shown, setShown] = useState<Emote | null>(null)
  useEffect(() => {
    if (!latest) return
    const left = latest.at + BUBBLE_MS - Date.now()
    if (left <= 0) return
    setShown(latest.e)
    const t = setTimeout(() => setShown(null), left)
    return () => clearTimeout(t)
  }, [latest])
  return shown
}

function Bubble({ emote }: { emote: Emote }) {
  const { t } = useTranslation()
  return (
    <span role="status" className="rounded-full border-2 border-wood bg-cream px-2 py-0.5 text-lg shadow" aria-label={t(`multiplayer.emote.${emote}`)}>
      {EMOTE_ICON[emote]}
    </span>
  )
}

function Other({ p, reduced, showPet }: { p: OtherPlayer; reduced: boolean; showPet: boolean }) {
  const { t } = useTranslation()
  const target = useRef(p)
  target.current = p
  const leader = useMemo<Leader & { hero: { speed01: number } }>(() => ({ hero: { pos: { x: p.x, y: p.y }, facing: 0, speed01: 0 } }), [p.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const speed = useMemo(() => ({ get current() { return leader.hero.speed01 } }), [leader])
  const ref = useRef<Group>(null)
  const emote = useBubble(p.id)
  const name = p.name ?? t('multiplayer.player')

  useFrame((_, dt) => {
    const h = leader.hero
    const next = glide(h.pos, target.current, dt, WALK_SPEED)
    const moved = Math.hypot(next.x - h.pos.x, next.y - h.pos.y)
    h.facing = faceToward(h.pos, next, h.facing)
    h.speed01 = dt > 0 ? Math.min(1, moved / dt / WALK_SPEED) : 0
    h.pos = next
    const g = ref.current
    if (!g) return
    g.position.set(next.x, 0, next.y)
    const body = g.children[1] as Group | undefined
    if (body) body.rotation.y = reduced ? h.facing : turnToward(body.rotation.y, h.facing, Math.min(1, dt * 12))
  })

  return (
    <>
      <group ref={ref} position={[p.x, 0, p.y]}>
        <Blob size={0.7} />
        <group scale={HERO_SCALE}>
          <HeroModel appearance={p.appearance as Appearance} speed={speed} reducedMotion={reduced} />
        </group>
        <Html position={[0, 1.75, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
          <div className="flex flex-col items-center gap-1">
            {emote && <Bubble emote={emote} />}
            <button
              type="button"
              onClick={() => useGame.setState({ playerCard: p.id })}
              aria-label={t('multiplayer.openCard', { name })}
              className="flex items-center gap-1 whitespace-nowrap rounded-full bg-ink/60 px-2 py-0.5 text-xs font-bold text-white"
            >
              {p.battle && <span aria-label={t('multiplayer.inBattle')}>⚔</span>}
              {name}
            </button>
          </div>
        </Html>
      </group>
      {showPet && p.pet && <PetFollower leader={leader} pet={p.pet} reduced={reduced} />}
    </>
  )
}

/** The player's own emote, over their own hero. */
function SelfBubble({ sim }: { sim: WorldSim }) {
  const you = useRoom((s) => s.you)
  const emote = useBubble(you)
  const ref = useRef<Group>(null)
  useFrame(() => ref.current?.position.set(sim.hero.pos.x, 0, sim.hero.pos.y))
  return (
    <group ref={ref}>
      {emote && (
        <Html position={[0, 1.75, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
          <Bubble emote={emote} />
        </Html>
      )}
    </group>
  )
}

/** Sends this player's spot to the room while it changes (the client keeps it to 2 a second). */
function SendPosition({ sim, client }: { sim: WorldSim; client: RoomClient }) {
  const last = useRef({ x: -1, y: -1, battle: false })
  useFrame(() => {
    const { x, y } = sim.hero.pos
    const g = useGame.getState()
    const battle = Boolean(g.battle || g.boss)
    const l = last.current
    if (Math.abs(x - l.x) < 0.05 && Math.abs(y - l.y) < 0.05 && battle === l.battle) return
    last.current = { x, y, battle }
    client.sendMove(x, y, battle)
  })
  return null
}

/** Everyone else in this island's room, plus this player's own emote bubble and position updates. */
export function OtherPlayers({ sim, client, reduced, lowQuality }: { sim: WorldSim; client: RoomClient | null; reduced: boolean; lowQuality: boolean }) {
  const players = useRoom((s) => s.players)
  // Hidden players see everyone but send nothing: every message to the server counts against the free plan.
  const visible = useRoom((s) => s.visible)
  if (!client) return null
  const list = Object.values(players)
  const pets = !(lowQuality && list.length > 6)
  return (
    <>
      {visible && <SendPosition sim={sim} client={client} />}
      <SelfBubble sim={sim} />
      {list.map((p) => (
        <Other key={p.id} p={p} reduced={reduced} showPet={pets} />
      ))}
    </>
  )
}
