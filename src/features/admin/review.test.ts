import { describe, expect, it } from 'vitest'
import { allowedActions, findDuplicates } from './review'

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
