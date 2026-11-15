export type AgeBand = 'under13' | 'teen' | 'adult'

/**
 * Youngest possible age for a birth year, so protections lean safe.
 * Must match public.age_band_for() in supabase/migrations (the server is the authority).
 */
export function ageBandFromBirthYear(birthYear: number, now: Date = new Date()): AgeBand {
  const youngestAge = now.getFullYear() - birthYear - 1
  if (youngestAge < 13) return 'under13'
  if (youngestAge < 18) return 'teen'
  return 'adult'
}
