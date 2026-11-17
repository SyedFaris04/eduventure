import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type Lang = 'python' | 'javascript'
export type CourseLang = Lang | 'english' | 'malay'
export type CourseKind = 'code' | 'language'
export type LessonStep = {
  id: string
  kind: 'learn' | 'predict' | 'fix' | 'write' | 'card' | 'pick' | 'match' | 'build' | 'gap' | 'listen' | 'type'
  text: string
  code?: string | null
  options?: { id: string; text: string }[] | null
  broken_line?: number | null
  starter?: string | null
  expected_output?: string | null
  must_use?: string[] | null
  hint?: string | null
  word?: string | null
  meaning?: string | null
  emoji?: string | null
  say?: string | null
  prompt?: string | null
  note?: string | null
  sentence?: string | null
  tiles?: string[] | null
  pairs?: { left: string[]; right: string[] } | null
}
export type LessonStart = {
  attempt_id: string
  lesson: { id: string; title: string; course_id: string; unit_index: number; lesson_index: number }
  steps: LessonStep[]
  results: { step_id: string; correct: boolean; tries: number }[]
}
export type StepAnswer = { choice: string } | { text: string } | { line: string } | { order: string[] } | { pairs: [string, string][] }
export type StepResult = { correct: boolean; explanation: string | null; accepted: string | null }
export type LessonDone = { first_time: boolean; xp: number; gold: number; totals: { xp: number; level: number; gold: number }; leveled_up: boolean }

/** Turns server errors into i18n keys for the lesson page. */
export class AcademyError extends Error {
  constructor(public key: string) {
    super(key)
  }
}
const fail = (message: string): never => {
  throw new AcademyError(
    /too fast/i.test(message) ? 'academy.errors.tooFast'
    : /finish unit/i.test(message) ? 'academy.errors.locked'
    : /not found/i.test(message) ? 'academy.errors.notFound'
    : /answer every question/i.test(message) ? 'academy.errors.unanswered'
    : 'academy.errors.generic',
  )
}
async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) fail(error.message)
  return data as T
}

export const startLesson = (lesson: string) => call<LessonStart>('start_lesson', { p_lesson: lesson })
export const answerStep = (attempt: string, step: string, answer: StepAnswer) => call<StepResult>('answer_lesson_step', { p_attempt: attempt, p_step: step, p_answer: answer })
export const noteWriteAttempt = (attempt: string, step: string) => call<void>('note_write_attempt', { p_attempt: attempt, p_step: step })
export const lessonSolution = (attempt: string, step: string) => call<string>('lesson_solution', { p_attempt: attempt, p_step: step })
export const completeLesson = (attempt: string) => call<LessonDone>('complete_lesson', { p_attempt: attempt })

export type CatalogueLesson = { id: string; course_id: string; unit_index: number; unit_title: string; lesson_index: number; title: string }
export type Catalogue = { courses: { id: string; kind: CourseKind; language: CourseLang; title: string; units: { index: number; title: string; lessons: CatalogueLesson[] }[] }[] }

/** Every visible course with its units and lessons, in order. */
export function useCatalogue() {
  return useQuery({
    queryKey: ['academy-catalogue'],
    queryFn: async (): Promise<Catalogue> => {
      const [c, l] = await Promise.all([
        supabase!.from('courses').select('id, kind, language, title, sort').order('sort'),
        supabase!.from('lessons').select('id, course_id, unit_index, unit_title, lesson_index, title').order('unit_index').order('lesson_index'),
      ])
      if (c.error) throw c.error
      if (l.error) throw l.error
      const lessons = l.data as CatalogueLesson[]
      return {
        courses: (c.data as { id: string; kind: CourseKind; language: CourseLang; title: string }[]).map((course) => {
          const mine = lessons.filter((x) => x.course_id === course.id)
          const indexes = [...new Set(mine.map((x) => x.unit_index))]
          return { ...course, units: indexes.map((i) => ({ index: i, title: mine.find((x) => x.unit_index === i)!.unit_title, lessons: mine.filter((x) => x.unit_index === i) })) }
        }),
      }
    },
  })
}

export const progressKey = (course: string) => ['academy-progress', course]
/** Lesson ids this player has finished in a course (from lesson_rewards on the server). */
export function useCourseProgress(course: string) {
  return useQuery({ queryKey: progressKey(course), queryFn: async () => new Set(await call<string[]>('my_course_progress', { p_course: course })) })
}
