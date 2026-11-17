import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type Status = 'draft' | 'in_review' | 'approved' | 'published' | 'rejected'
export type Action = 'submit' | 'approve' | 'reject' | 'request_changes' | 'publish' | 'unpublish'

/** Same transitions as public.review_question(); publishing is admin-only. */
export function allowedActions(status: Status, isAdmin: boolean): Action[] {
  const map: Record<Status, Action[]> = {
    draft: ['submit', 'reject'],
    in_review: ['approve', 'reject', 'request_changes'],
    approved: ['publish', 'reject', 'request_changes'],
    published: ['unpublish'],
    rejected: ['request_changes'],
  }
  return map[status].filter((a) => isAdmin || (a !== 'publish' && a !== 'unpublish'))
}

const normalise = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** Questions whose prompts are identical once case, spacing and punctuation are ignored. */
export function findDuplicates(qs: { id: string; prompt: string }[]): Record<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const q of qs) groups.set(normalise(q.prompt), [...(groups.get(normalise(q.prompt)) ?? []), q.id])
  const out: Record<string, string[]> = {}
  for (const ids of groups.values()) if (ids.length > 1) for (const id of ids) out[id] = ids.filter((x) => x !== id)
  return out
}

export type AdminQuestion = {
  id: string
  version: number
  status: Status
  level_ids: string[]
  subject_id: string
  topic: string
  subtopic: string
  difficulty: number
  bloom: string
  type: string
  prompt: string
  options: { id: string; text: string }[] | null
  unit: string | null
  objective: string
  alignment: string
  source_name: string
  license: string
  verification: string
  key?: { answer: unknown; explanation: string; wrong: Record<string, string> | null; mistakes: { value: number; why: string }[] | null }
  stats?: { attempts: number; correct: number }
}

export function useMyRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ['roles', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('my_roles')
      if (error) throw error
      return (data ?? []) as string[]
    },
  })
}

export function useQuestionBank(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'bank'],
    enabled,
    queryFn: async () => {
      const [qs, keys, stats] = await Promise.all([
        supabase!.from('questions').select('*').order('id'),
        supabase!.from('question_keys').select('*'),
        supabase!.rpc('question_stats'),
      ])
      for (const r of [qs, keys, stats]) if (r.error) throw r.error
      const keyById = new Map((keys.data ?? []).map((k) => [k.question_id as string, k]))
      const statById = new Map(((stats.data ?? []) as { question_id: string; attempts: number; correct: number }[]).map((s) => [s.question_id, s]))
      return (qs.data as AdminQuestion[]).map((q) => ({
        ...q,
        key: keyById.get(q.id) as AdminQuestion['key'],
        stats: statById.has(q.id) ? { attempts: Number(statById.get(q.id)!.attempts), correct: Number(statById.get(q.id)!.correct) } : undefined,
      }))
    },
  })
}

export type Review = { id: number; action: Action; from_status: Status; to_status: Status; note: string | null; created_at: string; version: number }

export function useHistory(questionId: string | null) {
  return useQuery({
    queryKey: ['admin', 'history', questionId],
    enabled: Boolean(questionId),
    queryFn: async () => {
      const { data, error } = await supabase!.from('question_reviews').select('id, action, from_status, to_status, note, created_at, version').eq('question_id', questionId!).order('id', { ascending: false })
      if (error) throw error
      return data as Review[]
    },
  })
}

export async function reviewQuestion(id: string, action: Action, note: string | null) {
  const { data, error } = await supabase!.rpc('review_question', { p_id: id, p_action: action, p_note: note })
  if (error) throw new Error(error.message)
  return data as { id: string; status: Status }
}

export async function bulkReview(ids: string[], action: Action, note: string | null) {
  const { data, error } = await supabase!.rpc('bulk_review', { p_ids: ids, p_action: action, p_note: note })
  if (error) throw new Error(error.message)
  return data as { done: number; skipped: { id: string; reason: string }[] }
}

export type AdminLessonStep = { id: string; lesson_id: string; step_index: number; kind: string; text: string; code?: string | null; options?: { id: string; text: string }[] | null; broken_line?: number | null; starter?: string | null; expected_output?: string | null; key?: { answer: unknown; explanation: string | null; solution: string | null } }
export type AdminLesson = { id: string; course_id: string; unit_index: number; unit_title: string; lesson_index: number; title: string; objective: string; status: Status; version: number; steps: AdminLessonStep[] }

/** Lessons in course/unit/lesson order, each with its steps in order and each step's answer key. */
export function groupLessons(lessons: Omit<AdminLesson, 'steps'>[], steps: AdminLessonStep[], keys: { step_id: string; answer: unknown; explanation: string | null; solution: string | null }[]): AdminLesson[] {
  const keyOf = new Map(keys.map(({ step_id, ...k }) => [step_id, k]))
  return [...lessons]
    .sort((a, b) => a.course_id.localeCompare(b.course_id) || a.unit_index - b.unit_index || a.lesson_index - b.lesson_index)
    .map((l) => ({
      ...l,
      steps: steps
        .filter((s) => s.lesson_id === l.id)
        .sort((a, b) => a.step_index - b.step_index)
        .map((s) => (keyOf.has(s.id) ? { ...s, key: keyOf.get(s.id) } : s)),
    }))
}

/** Every lesson (any status) for reviewers; RLS only lets admins and educators read drafts and keys. */
export function useLessonBank(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'lessons'],
    enabled,
    queryFn: async () => {
      const [ls, st, ks] = await Promise.all([
        supabase!.from('lessons').select('id, course_id, unit_index, unit_title, lesson_index, title, objective, status, version'),
        supabase!.from('lesson_steps').select('*'),
        supabase!.from('lesson_step_keys').select('*'),
      ])
      for (const r of [ls, st, ks]) if (r.error) throw r.error
      return groupLessons(ls.data as Omit<AdminLesson, 'steps'>[], st.data as AdminLessonStep[], ks.data as { step_id: string; answer: unknown; explanation: string | null; solution: string | null }[])
    },
  })
}

export async function reviewLesson(id: string, action: Action, note = '') {
  const { error } = await supabase!.rpc('review_lesson', { p_id: id, p_action: action, p_note: note })
  if (error) throw error
}
