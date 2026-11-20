import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { FestivalKind } from './festivalRules'

export type Festival = { id: string; kind: FestivalKind; starts_on: string; ends_on: string; preview: boolean }
export type MyFestivals = { festivals: Festival[]; tokens: number }

export const festivalsKey = (uid?: string) => ['festivals', uid]

/** The festivals on for this player (by Malaysia date, or an admin's preview) and their festival tokens. */
export function useFestivals(uid?: string) {
  return useQuery({
    queryKey: festivalsKey(uid),
    enabled: Boolean(uid),
    refetchInterval: 600_000,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_festivals')
      if (error) throw error
      return data as MyFestivals
    },
  })
}

/** Turns stall refusals into i18n keys. */
export function festivalErrorKey(message: string | undefined) {
  const m = message ?? ''
  return /not on right now/i.test(m) ? 'festival.errors.off'
    : /already own/i.test(m) ? 'shop.errors.owned'
    : /not enough festival tokens/i.test(m) ? 'festival.errors.tokens'
    : 'shop.errors.failed'
}

/** The server checks the festival, ownership and tokens. Returns the tokens left. */
export async function buyFestivalItem(id: string): Promise<number> {
  const { data, error } = await supabase!.rpc('buy_festival_item', { p_item: id })
  if (error) throw error
  return Number((data as { tokens: number }).tokens)
}

/** Admins only: preview a festival (or stop, with null). A reset wipes the admin's own progress for that festival. */
export async function setFestivalPreview(id: string | null, reset: boolean): Promise<void> {
  const { error } = await supabase!.rpc('set_festival_preview', { p_id: id, p_reset: reset })
  if (error) throw error
}
