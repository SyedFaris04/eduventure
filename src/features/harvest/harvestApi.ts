import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { Material } from '../../game/map'
import type { AnswerPayload, AnswerResult } from '../battle/battleApi'
import type { PublicQuestion } from '../battle/questionSchema'

export type Materials = Record<Material, number>
export type Tool = 'stone_axe' | 'stone_pickaxe' | 'crystal_axe' | 'crystal_pickaxe'
export type MyMaterials = { materials: Materials; tools: Tool[] }
export type HarvestResult = Pick<AnswerResult, 'correct' | 'correct_answer' | 'explanation' | 'wrong_reason' | 'missions_completed'> & {
  material: Material
  gained: number
  materials: Materials
}
type Cooldown = { x: number; y: number; ready_at: string }

/** Turns database errors into i18n keys. */
export function harvestErrorKey(message: string | undefined) {
  const m = message ?? ''
  return /regrowing/i.test(m) ? 'harvest.errors.regrowing'
    : /pickaxe/i.test(m) ? 'harvest.errors.pickaxe'
    : /too fast/i.test(m) ? 'battle.errors.tooFast'
    : /time's up/i.test(m) ? 'parents.timeUp'
    : /not enough/i.test(m) ? 'harvest.errors.notEnough'
    : 'battle.errors.generic'
}

export class HarvestError extends Error {}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw new HarvestError(harvestErrorKey(error.message))
  return data as T
}

export const startHarvest = (place: string, x: number, y: number) => call<{ material: Material; question: PublicQuestion }>('start_harvest', { p_place: place, p_x: x, p_y: y })
export const answerHarvest = (answer: AnswerPayload) => call<HarvestResult>('answer_harvest', { p_answer: answer })

/** "x,y" of every node this player has harvested recently. */
export const regrowingSet = (cooldowns: Cooldown[], now = Date.now()) => new Set(cooldowns.filter((c) => Date.parse(c.ready_at) > now).map((c) => `${c.x},${c.y}`))

export const materialsKey = (uid: string | undefined) => ['materials', uid]
export const cooldownsKey = (uid: string | undefined, place: string) => ['harvest-cooldowns', uid, place]

export function useMaterials(uid: string | undefined) {
  return useQuery({ queryKey: materialsKey(uid), enabled: Boolean(uid), queryFn: () => call<MyMaterials>('my_materials') })
}

/** Nodes regrowing for this player here; checked again every 30 s so regrown nodes come back. */
export function useRegrowing(uid: string | undefined, place: string) {
  return useQuery({
    queryKey: cooldownsKey(uid, place),
    enabled: Boolean(uid),
    refetchInterval: 30_000,
    queryFn: async () => regrowingSet(await call<Cooldown[]>('my_harvest_cooldowns', { p_place: place })),
  })
}
