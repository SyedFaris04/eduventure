import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../services/supabase'

type SessionState = { session: Session | null; loading: boolean; offline: boolean }

export const useSessionStore = create<SessionState>(() => ({
  session: null,
  loading: isSupabaseConfigured,
  offline: !isSupabaseConfigured,
}))

let started = false

/** Keeps the store in step with Supabase auth. Called once at startup. */
export function startSessionSync() {
  if (started || !supabase) return
  started = true
  supabase.auth
    .getSession()
    .then(({ data }) => useSessionStore.setState({ session: data.session, loading: false }))
    .catch(() => useSessionStore.setState({ loading: false, offline: true }))
  supabase.auth.onAuthStateChange((_event, session) => useSessionStore.setState({ session, loading: false }))
}

export const useSession = () => useSessionStore()
