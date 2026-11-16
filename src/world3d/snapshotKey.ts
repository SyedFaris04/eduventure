import { PART_ORDER, type Appearance } from '../features/character/appearance'
import type { MonsterKind } from '../game/map'

/** What a still picture shows. Kept apart from the renderer so pages can key pictures without loading three.js. */
export type Subject = { kind: 'hero'; appearance: Appearance } | { kind: 'monster'; monster: MonsterKind } | { kind: 'boss' }

export function snapshotKey(s: Subject): string {
  if (s.kind === 'hero') return `hero:${PART_ORDER.map((p) => s.appearance[p]).join('|')}`
  return s.kind === 'monster' ? `monster:${s.monster}` : 'boss:guardian'
}

/** Height ÷ width of each kind of picture. */
export const aspect = (s: Subject) => (s.kind === 'hero' ? 1.4 : 1)
