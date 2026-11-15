import { describe, expect, it } from 'vitest'
import { curriculaFor, firstIncompleteStep, gradesFor, onboardingSchema, subjectsFor, type Curriculum, type Grade, type OnboardingValues, type Subject } from './schema'

const CURRICULA: Curriculum[] = [
  { id: 'international', country_code: null, name: 'International', level_ids: ['primary', 'lower_secondary', 'lifelong'] },
  { id: 'my_kssr', country_code: 'MY', name: 'KSSR', level_ids: ['primary'] },
  { id: 'my_kssm', country_code: 'MY', name: 'KSSM', level_ids: ['lower_secondary'] },
]
const GRADES: Grade[] = [
  { id: 'my_kssr_primary_2', curriculum_id: 'my_kssr', level_id: 'primary', name: 'Tahun 2', sort: 2 },
  { id: 'my_kssr_primary_1', curriculum_id: 'my_kssr', level_id: 'primary', name: 'Tahun 1', sort: 1 },
  { id: 'international_primary_1', curriculum_id: 'international', level_id: 'primary', name: 'Grade 1', sort: 1 },
]
const SUBJECTS: Subject[] = [
  { id: 'mathematics', name: 'Mathematics', level_ids: ['primary', 'lower_secondary'] },
  { id: 'physics', name: 'Physics', level_ids: ['lower_secondary'] },
]

const valid: OnboardingValues = {
  level_id: 'primary',
  country_code: 'MY',
  curriculum_id: 'my_kssr',
  grade_id: 'my_kssr_primary_1',
  language: 'ms',
  subject_ids: ['mathematics'],
  goals: ['homework_help'],
  difficulty: 2,
}

describe('onboardingSchema', () => {
  it('accepts a complete profile', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects an empty subject list', () => {
    expect(onboardingSchema.safeParse({ ...valid, subject_ids: [] }).success).toBe(false)
  })
  it('rejects an unknown goal and an out-of-range difficulty', () => {
    expect(onboardingSchema.safeParse({ ...valid, goals: ['win_prizes'] }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...valid, difficulty: 6 }).success).toBe(false)
  })
})

describe('curriculaFor', () => {
  it('offers the national curriculum first, then international', () => {
    expect(curriculaFor(CURRICULA, 'MY', 'primary').map((c) => c.id)).toEqual(['my_kssr', 'international'])
  })
  it('offers only international where no national mapping exists yet', () => {
    expect(curriculaFor(CURRICULA, 'FR', 'primary').map((c) => c.id)).toEqual(['international'])
  })
})

describe('gradesFor / subjectsFor', () => {
  it('returns grades of the curriculum and level in order', () => {
    expect(gradesFor(GRADES, 'my_kssr', 'primary').map((g) => g.name)).toEqual(['Tahun 1', 'Tahun 2'])
  })
  it('filters subjects by level', () => {
    expect(subjectsFor(SUBJECTS, 'primary').map((s) => s.id)).toEqual(['mathematics'])
  })
})

describe('firstIncompleteStep', () => {
  it('starts with the age step for guests without a birth year', () => {
    expect(firstIncompleteStep({}, { needsAge: true })).toBe('age')
  })
  it('sends a player who skipped ahead back to the first missing answer', () => {
    expect(firstIncompleteStep({ level_id: 'primary' }, { needsAge: false })).toBe('country')
    expect(firstIncompleteStep({ level_id: 'primary', country_code: 'MY', curriculum_id: 'my_kssr' }, { needsAge: false })).toBe('subjects')
  })
  it('returns null when everything required is answered', () => {
    expect(firstIncompleteStep(valid, { needsAge: false })).toBeNull()
  })
})
