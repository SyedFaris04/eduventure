import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const ownedItemsKey = (userId: string | undefined) => ['owned-items', userId]

/** Ids of the shop items this player owns (the database only shows a player their own rows). */
export function useOwnedItems(userId: string | undefined) {
  return useQuery({
    queryKey: ownedItemsKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase!.from('player_items').select('item_id')
      if (error) throw error
      return new Set((data ?? []).map((r) => r.item_id as string))
    },
  })
}

/** The database checks the price and the player's gold; this only asks. Returns the new gold total. */
export async function buyItem(itemId: string): Promise<number> {
  const { data, error } = await supabase!.rpc('buy_item', { p_item: itemId })
  if (error) throw error
  return Number((data as { gold: number }).gold)
}
