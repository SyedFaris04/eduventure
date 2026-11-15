import { z } from 'zod'
import { LANGUAGES } from '../../i18n'

export type Level = { id: string; isced: string; sort: number }
export type Country = { code: string; name: string }
export type Curriculum = { id: string; country_code: string | null; name: string; level_ids: string[] }
export type Grade = { id: string; curriculum_id: string; level_id: string; name: string; sort: number }
export type Subject = { id: string; name: string; level_ids: string[] }

export const GOALS = ['exam_prep', 'homework_help', 'catch_up', 'get_ahead', 'curiosity', 'career_skills'] as const
export const DIFFICULTIES = [1, 2, 3, 4, 5] as const

// Mirrors the academic_profiles table and its checks; the database re-validates everything.
export const onboardingSchema = z.object({
  level_id: z.string().min(1),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  curriculum_id: z.string().min(1),
  grade_id: z.string().nullable(),
  language: z.enum(LANGUAGES.map((l) => l.code) as [string, ...string[]]),
  subject_ids: z.array(z.string()).min(1).max(20),
  goals: z.array(z.enum(GOALS)).max(GOALS.length),
  difficulty: z.number().int().min(1).max(5),
})
export type OnboardingValues = z.infer<typeof onboardingSchema>

export const STEPS = ['age', 'level', 'country', 'curriculum', 'grade', 'language', 'subjects', 'goals', 'difficulty'] as const
export type Step = (typeof STEPS)[number]

/** National curricula first (the player's own system), then the international option. */
export function curriculaFor(all: Curriculum[], countryCode: string | undefined, levelId: string | undefined) {
  if (!countryCode || !levelId) return []
  return all
    .filter((c) => c.level_ids.includes(levelId) && (c.country_code === null || c.country_code === countryCode))
    .sort((a, b) => Number(a.country_code === null) - Number(b.country_code === null) || a.name.localeCompare(b.name))
}

export function gradesFor(all: Grade[], curriculumId: string | undefined, levelId: string | undefined) {
  return all.filter((g) => g.curriculum_id === curriculumId && g.level_id === levelId).sort((a, b) => a.sort - b.sort)
}

export function subjectsFor(all: Subject[], levelId: string | undefined) {
  return levelId ? all.filter((s) => s.level_ids.includes(levelId)) : []
}

/** The first step whose required answer is missing, so a reload or deep link never skips ahead. */
export function firstIncompleteStep(v: Partial<OnboardingValues>, opts: { needsAge: boolean }): Step | null {
  if (opts.needsAge) return 'age'
  if (!v.level_id) return 'level'
  if (!v.country_code) return 'country'
  if (!v.curriculum_id) return 'curriculum'
  if (!v.subject_ids?.length) return 'subjects'
  return null
}
