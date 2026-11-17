import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

/** How many Returning monsters (due topics) wait on each island, decided by the server. */
export function useReturning(uid: string | undefined) {
  return useQuery({
    queryKey: ['returning', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_returning')
      if (error) throw error
      return Object.fromEntries((data as { island_id: string; count: number }[]).map((r) => [r.island_id, r.count])) as Record<string, number>
    },
  })
}
