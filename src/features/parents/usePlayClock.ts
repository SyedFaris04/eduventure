import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

/**
 * While a player is in the world or a lesson with the page visible, tell the server once a minute (it counts at most
 * one minute per 50 s) and count this session's minutes for the break reminder.
 */
export function usePlayClock(uid: string | undefined, active = true) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(0)
  useEffect(() => {
    if (!uid || !active || !supabase) return
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      setSession((m) => m + 1)
      const { data } = await supabase!.rpc('note_play')
      if (data) queryClient.setQueryData(['guardian', uid], (g: object | undefined) => (g ? { ...g, minutes_today: data.minutes_today, minutes_left: data.minutes_left } : g))
    }
    const timer = setInterval(() => void tick(), 60_000)
    return () => clearInterval(timer)
  }, [uid, active, queryClient])
  return session
}
