import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { sanitizeAppearance, type Appearance } from './appearance'

export type MyCharacter = { name: string; appearance: Appearance }

export function useMyCharacter(userId: string | undefined) {
  return useQuery({
    queryKey: ['character', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase!.from('characters').select('name, appearance').maybeSingle()
      if (error) throw error
      return data ? ({ name: data.name, appearance: sanitizeAppearance(data.appearance) } as MyCharacter) : null
    },
  })
}

/** Throws the Postgres error; the database re-checks the name rule for the player's age band. */
export async function saveCharacter(userId: string, name: string, appearance: Appearance) {
  const { error } = await supabase!.from('characters').upsert({ user_id: userId, name, appearance }, { onConflict: 'user_id' })
  if (error) throw error
}
