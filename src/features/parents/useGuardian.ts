import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type Guardian = {
  status: 'not_needed' | 'none' | 'pending' | 'approved'
  code?: string
  expires_at?: string
  daily_limit?: number | null
  minutes_today: number
  minutes_left?: number | null
}

export const guardianKey = (uid: string | undefined) => ['guardian', uid]

/** Whether this player needs, is waiting for, or has a parent's approval (decided by the server). */
export function useGuardian(uid: string | undefined) {
  return useQuery({
    queryKey: guardianKey(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_guardian')
      if (error) throw error
      return data as Guardian
    },
  })
}

export async function requestGuardianCode(): Promise<{ code: string; expires_at: string }> {
  const { data, error } = await supabase!.rpc('request_guardian_code')
  if (error) throw error
  return data
}
