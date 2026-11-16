import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { sanitizeAppearance, type Appearance } from './appearance'

export type MyCharacter = { name: string; appearance: Appearance }

/** Shared by the hook, the progress guard and the boot prefetch so all three read one cache entry. */
export const characterQuery = (userId: string | undefined) => ({
  queryKey: ['character', userId],
  enabled: Boolean(userId),
  queryFn: async () => {
    const { data, error } = await supabase!.from('characters').select('name, appearance').maybeSingle()
    if (error) throw error
    return data ? ({ name: data.name, appearance: sanitizeAppearance(data.appearance) } as MyCharacter) : null
  },
})

export function useMyCharacter(userId: string | undefined) {
  return useQuery(characterQuery(userId))
}

/** Throws the Postgres error; the database re-checks the name rule for the player's age band. */
export async function saveCharacter(userId: string, name: string, appearance: Appearance) {
  const { error } = await supabase!.from('characters').upsert({ user_id: userId, name, appearance }, { onConflict: 'user_id' })
  if (error) throw error
}

export function useProgression(userId: string | undefined) {
  return useQuery({
    queryKey: ['progression', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [xp, wallet] = await Promise.all([
        supabase!.from('player_xp').select('xp, level').single(),
        supabase!.from('player_wallets').select('gold').single(),
      ])
      if (xp.error) throw xp.error
      if (wallet.error) throw wallet.error
      return { xp: Number(xp.data.xp), level: xp.data.level as number, gold: Number(wallet.data.gold) }
    },
  })
}
