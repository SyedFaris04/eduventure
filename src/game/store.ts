import { create } from 'zustand'
import type { Point } from './iso'
import type { BossId, MonsterKind, NpcId } from './map'

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
}))

// Development builds only: lets automated tests and debugging read the game state.
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame

/** True while a panel owns the input (dialogue, battle or boss): the world pauses movement. */
export const worldPaused = () => {
  const s = useGame.getState()
  return Boolean(s.dialogue || s.battle || s.boss)
}

export const pressInteract = () => useGame.setState((s) => ({ interactSeq: s.interactSeq + 1 }))
