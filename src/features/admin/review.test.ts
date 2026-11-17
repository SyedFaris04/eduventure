import { describe, expect, it } from 'vitest'
import { allowedActions, findDuplicates, groupLessons } from './review'

describe('allowedActions (mirrors review_question in SQL)', () => {
  it('lets educators approve, reject or send back questions in review', () => {
    expect(allowedActions('in_review', false)).toEqual(['approve', 'reject', 'request_changes'])
  })
  it('only lets admins publish approved questions', () => {
    expect(allowedActions('approved', false)).toEqual(['reject', 'request_changes'])
    expect(allowedActions('approved', true)).toEqual(['publish', 'reject', 'request_changes'])
  })
  it('lets admins unpublish', () => {
    expect(allowedActions('published', true)).toEqual(['unpublish'])
    expect(allowedActions('published', false)).toEqual([])
  })
  it('lets drafts be submitted and rejected ones reopened', () => {
    expect(allowedActions('draft', false)).toEqual(['submit', 'reject'])
    expect(allowedActions('rejected', false)).toEqual(['request_changes'])
  })
})

describe('findDuplicates', () => {
  it('matches prompts that differ only in case, spacing and punctuation', () => {
    const dupes = findDuplicates([
      { id: 'a', prompt: 'What is 7 × 8?' },
      { id: 'b', prompt: 'what is 7×8' },
      { id: 'c', prompt: 'What is 7 × 9?' },
    ])
    expect(dupes).toEqual({ a: ['b'], b: ['a'] })
  })
})

describe('lesson review', () => {
  it('lesson actions match question actions', () => {
    expect(allowedActions('in_review', false)).toEqual(['approve', 'reject', 'request_changes'])
    expect(allowedActions('approved', true)).toContain('publish')
  })

  it('groups lessons with their steps and answers, in order', () => {
    const lessons = [
      { id: 'py-u1-l2', course_id: 'python-basics', unit_index: 1, unit_title: 'Hello', lesson_index: 2, title: 'B', objective: 'o', status: 'in_review' as const, version: 1 },
      { id: 'py-u1-l1', course_id: 'python-basics', unit_index: 1, unit_title: 'Hello', lesson_index: 1, title: 'A', objective: 'o', status: 'approved' as const, version: 1 },
    ]
    const steps = [
      { id: 'py-u1-l1-s2', lesson_id: 'py-u1-l1', step_index: 2, kind: 'predict', text: 't2', code: 'print(1)' },
      { id: 'py-u1-l1-s1', lesson_id: 'py-u1-l1', step_index: 1, kind: 'learn', text: 't1', code: 'print(0)' },
    ]
    const keys = [{ step_id: 'py-u1-l1-s2', answer: { text: '1' }, explanation: 'e', solution: null }]
    const out = groupLessons(lessons, steps, keys)
    expect(out.map((l) => l.id)).toEqual(['py-u1-l1', 'py-u1-l2'])
    expect(out[0].steps.map((s) => s.id)).toEqual(['py-u1-l1-s1', 'py-u1-l1-s2'])
    expect(out[0].steps[1].key).toEqual({ answer: { text: '1' }, explanation: 'e', solution: null })
    expect(out[1].steps).toEqual([])
  })
})
