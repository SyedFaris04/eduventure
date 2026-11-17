import { PART_ORDER, type Appearance } from '../features/character/appearance'
import type { BossId, MonsterKind } from '../game/map'
import type { Pet } from '../features/pet/petRules'

/** What a still picture shows. Kept apart from the renderer so pages can key pictures without loading three.js. */
export type Subject = { kind: 'hero'; appearance: Appearance } | { kind: 'monster'; monster: MonsterKind } | { kind: 'boss'; boss: BossId }
  | { kind: 'pet'; pet: Pick<Pet, 'species' | 'stage' | 'form' | 'look'> }

export function snapshotKey(s: Subject): string {
  if (s.kind === 'hero') return `hero:${PART_ORDER.map((p) => s.appearance[p]).join('|')}`
  if (s.kind === 'pet') return `pet:${[s.pet.species, s.pet.stage, s.pet.form, s.pet.look.hat, s.pet.look.neck, s.pet.look.dye].join('|')}`
  return s.kind === 'monster' ? `monster:${s.monster}` : `boss:${s.boss}`
}

/** Height ÷ width of each kind of picture. */
export const aspect = (s: Subject) => (s.kind === 'hero' ? 1.4 : 1)
