import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// null until .env.local is filled in, so the app can explain what is missing instead of crashing.
export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null

/** Real network round trip to the project's auth service. Resolves to the service version. */
export async function pingSupabase(): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing in .env.local')
  const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key! } })
  if (!res.ok) throw new Error(`Supabase answered ${res.status} ${res.statusText}`)
  const body = (await res.json()) as { version?: string }
  return body.version ?? 'unknown version'
}
