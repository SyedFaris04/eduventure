import { unlockLevel } from '../../game/unlocks'
import type { ShopItem } from '../shop/catalogue'

// Mirrors of the database rules (public.pet_form, public.pet_next); tests/rls/pet.test.ts checks they agree.
export const PET_SPECIES = ['kancil', 'beruang', 'naga'] as const
export type PetSpecies = (typeof PET_SPECIES)[number]
export const PET_NAMES = ['comel', 'bulat', 'si_pintar', 'tompok', 'bintang', 'kiki', 'mochi', 'ombak'] as const
export const BRANCHES = ['science', 'maths', 'technology', 'language'] as const
export type Branch = (typeof BRANCHES)[number]
export type Branches = Record<Branch, number>
export type PetStage = 'baby' | 'young' | 'adult'
export type PetForm = Branch | 'seimbang'
export type PetLook = { hat?: string; neck?: string; dye?: string }
export type Pet = { species: PetSpecies; name: string; stage: PetStage; form: PetForm | null; points: number; branches: Branches; look: PetLook }

export const STEPS = { young: { points: 100, gold: 50 }, adult: { points: 300, gold: 150 } } as const
export const PET_SLOTS = ['pet_hat', 'pet_neck', 'pet_dye'] as const

/** The adult form: Seimbang when every subject has at least a fifth of the points, else the strongest subject. */
export function petForm(b: Branches): PetForm {
  const total = BRANCHES.reduce((s, k) => s + b[k], 0)
  if (total === 0 || BRANCHES.every((k) => b[k] >= 0.2 * total)) return 'seimbang'
  return BRANCHES.reduce((best, k) => (b[k] > b[best] ? k : best))
}

type Need = 'points' | 'level' | 'gold'
/** What the next evolution needs, and which of those the pet and player don't have yet. */
export function petNext(stage: PetStage, points: number, level: number, gold: number) {
  if (stage === 'adult') return { next: null, points: 0, level: 0, gold: 0, missing: [] as Need[] }
  const next = stage === 'baby' ? 'young' : 'adult'
  const need = { points: STEPS[next].points, level: unlockLevel('pet', `pet_${next}`)!, gold: STEPS[next].gold }
  const missing: Need[] = []
  if (points < need.points) missing.push('points')
  if (level < need.level) missing.push('level')
  if (gold < need.gold) missing.push('gold')
  return { next, ...need, missing } as { next: 'young' | 'adult' | null; points: number; level: number; gold: number; missing: Need[] }
}

export const isPetItem = (item: ShopItem) => item.slot.startsWith('pet_')
