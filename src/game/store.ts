import { create } from 'zustand'
import type { Point } from './iso'
import type { BossId, MonsterKind, NpcId } from './map'
import type { PlaceId } from './places'

export type Prompt = { kind: 'npc'; id: NpcId } | { kind: 'monster'; id: string; monster: MonsterKind } | { kind: 'boss'; id: BossId }

type GameState = {
  /** Joystick vector in screen space (−1..1); keyboard is read inside Phaser. */
  stick: Point
  /** Nearest thing the player can interact with, if any. */
  prompt: Prompt | null
  /** Bumped by the Interact button; Phaser treats each change as one press. */
  interactSeq: number
  dialogue: { npc: NpcId; page: number } | null
  battle: { monsterId: string; monster: MonsterKind } | null
  boss: BossId | null
  /** Player tile position for the minimap (updated a few times per second). */
  player: Point
  /** Monsters currently in the world, for the minimap. */
  monsters: { id: string; kind: MonsterKind; x: number; y: number }[]
  /** Set by the battle panel when a defeated monster's sprite should be removed. */
  defeated: string[]
  /** Bumped on a wrong answer / a won battle; the hero flinches or cheers once the panel closes. */
  hitSeq: number
  cheerSeq: number
  /** The boatman's destination list is open. */
  jetty: boolean
  /** Sailing to another place (the boat ride is showing). */
  travel: { to: PlaceId } | null
  /** Name of the area the player is standing in, for the banner. */
  area: string | null
  /** Cikgu Byte was asked to open the Code Academy; the world page navigates there. */
  academy: boolean
}

export const useGame = create<GameState>(() => ({
  stick: { x: 0, y: 0 },
  prompt: null,
  interactSeq: 0,
  dialogue: null,
  battle: null,
  boss: null,
  player: { x: 0, y: 0 },
  monsters: [],
  defeated: [],
  hitSeq: 0,
  cheerSeq: 0,
  jetty: false,
  travel: null,
  area: null,
  academy: false,
}))

// Development builds only: lets automated tests and debugging read the game state.
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame

/** True while a panel owns the input (dialogue, battle, boss or jetty): the world pauses movement. */
export const worldPaused = () => {
  const s = useGame.getState()
  return Boolean(s.dialogue || s.battle || s.boss || s.jetty)
}

/** Hero reaction after an answer: a flinch for a wrong one, a cheer for a win. */
export const reactToAnswer = (correct: boolean, won: boolean) =>
  useGame.setState((s) => ({ hitSeq: s.hitSeq + (correct ? 0 : 1), cheerSeq: s.cheerSeq + (won ? 1 : 0) }))

export const pressInteract = () => useGame.setState((s) => ({ interactSeq: s.interactSeq + 1 }))
