import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { Country, Curriculum, Grade, Level, Subject } from './schema'
import type { OnboardingValues } from './schema'

function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** All onboarding options in one round trip. They change only with a new seed, so cache forever. */
export function useReferenceData() {
  return useQuery({
    queryKey: ['reference'],
    staleTime: Infinity,
    queryFn: async () => {
      const [levels, countries, curricula, grades, subjects] = await Promise.all([
        db().from('education_levels').select('id, isced, sort').order('sort'),
        db().from('countries').select('code, name'),
        db().from('curricula').select('id, country_code, name, level_ids'),
        db().from('grades').select('id, curriculum_id, level_id, name, sort'),
        db().from('subjects').select('id, name, level_ids').order('name'),
      ])
      for (const r of [levels, countries, curricula, grades, subjects]) if (r.error) throw r.error
      return {
        levels: levels.data as Level[],
        countries: countries.data as Country[],
        curricula: curricula.data as Curriculum[],
        grades: grades.data as Grade[],
        subjects: subjects.data as Subject[],
      }
    },
  })
}

export type MyProfile = { birth_year: number | null; is_guest: boolean; display_name: string | null }

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await db().from('profiles').select('birth_year, is_guest, display_name').single()
      if (error) throw error
      return data as MyProfile
    },
  })
}

/** Shared by the hook, the progress guard and the boot prefetch so all three read one cache entry. */
export const academicQuery = (userId: string | undefined) => ({
  queryKey: ['academic', userId],
  enabled: Boolean(userId),
  queryFn: async () => {
    const { data, error } = await db()
      .from('academic_profiles')
      .select('level_id, country_code, curriculum_id, grade_id, language, subject_ids, goals, difficulty')
      .maybeSingle()
    if (error) throw error
    return data as OnboardingValues | null
  },
})

export function useMyAcademicProfile(userId: string | undefined) {
  return useQuery(academicQuery(userId))
}

export async function saveAcademicProfile(userId: string, values: OnboardingValues) {
  const { error } = await db().from('academic_profiles').upsert({ user_id: userId, ...values }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function setBirthYear(year: number) {
  const { error } = await db().rpc('set_birth_year', { p_year: year })
  if (error) throw error
}
