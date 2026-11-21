import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { Materials } from '../harvest/harvestApi'
import type { Placed } from './rules'

/** Turns database errors into i18n keys. */
export function islandErrorKey(message: string | undefined) {
  const m = message ?? ''
  return /fit there/i.test(m) ? 'island.notFit'
    : /not enough/i.test(m) ? 'island.notEnough'
    : /too many items/i.test(m) ? 'island.tooMany'
    : /unlocks at level/i.test(m) ? 'island.locked'
    : /time's up/i.test(m) ? 'parents.timeUp'
    : 'island.generic'
}

export class IslandError extends Error {
  constructor(key: string, readonly level?: number) {
    super(key)
  }
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw new IslandError(islandErrorKey(error.message), Number(/level (\d+)/i.exec(error.message)?.[1]) || undefined)
  return data as T
}

export const islandKey = (uid?: string) => ['island', uid]
export const useIslandItems = (uid?: string) => useQuery({ queryKey: islandKey(uid), enabled: Boolean(uid), queryFn: () => call<Placed[]>('my_island') })

export const placeItem = (item: string, x: number, y: number, rot: number) =>
  call<{ item: Placed; materials: Materials }>('place_island_item', { p_item: item, p_x: x, p_y: y, p_rot: rot })
export const moveItem = (id: number, x: number, y: number, rot: number) => call<{ item: Placed }>('move_island_item', { p_id: id, p_x: x, p_y: y, p_rot: rot })
export const removeItem = (id: number) => call<{ materials: Materials }>('remove_island_item', { p_id: id })
