import { describe, expect, it } from 'vitest'
import bank from '../../../content/questions/starter.json'
import { questionProblems, questionSource } from './questionSchema'

const questions = bank.questions as unknown[]

describe('starter question bank', () => {
  it('every question matches the schema', () => {
    const bad = questions
      .map((q) => ({ q: q as { id?: string }, r: questionSource.safeParse(q) }))
      .filter(({ r }) => !r.success)
      .map(({ q, r }) => `${q.id}: ${r.error!.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
    expect(bad).toEqual([])
  })

  it('passes the content rules (one right answer, a reason for every wrong option, …)', () => {
    const bad = questions.flatMap((q) => {
      const parsed = questionSource.parse(q)
      return questionProblems(parsed).map((problem) => `${parsed.id}: ${problem}`)
    })
    expect(bad).toEqual([])
  })

  it('has unique ids and unique prompts', () => {
    const parsed = questions.map((q) => questionSource.parse(q))
    expect(new Set(parsed.map((q) => q.id)).size).toBe(parsed.length)
    expect(new Set(parsed.map((q) => q.prompt.toLowerCase())).size).toBe(parsed.length)
  })

  it('matches the agreed starter mix', () => {
    const parsed = questions.map((q) => questionSource.parse(q))
    const count = (level: string, subject: string) => parsed.filter((q) => q.level_ids.length === 1 && q.level_ids[0] === level && q.subject === subject).length
    expect([count('primary', 'mathematics'), count('primary', 'science'), count('primary', 'english')]).toEqual([15, 10, 5])
    expect([count('lower_secondary', 'mathematics'), count('lower_secondary', 'science'), count('lower_secondary', 'english')]).toEqual([15, 10, 5])
    expect(parsed.filter((q) => q.level_ids.length === 11).length).toBe(10)
  })

  it('the rules really catch broken questions', () => {
    const good = questionSource.parse(questions[0]) as Extract<ReturnType<typeof questionSource.parse>, { type: 'mcq' }>
    expect(questionProblems({ ...good, answer: 'z' })).toContain('answer is not one of the options')
    expect(questionProblems({ ...good, wrong: {} }).length).toBe(good.options.length - 1)
    const blank = questionSource.parse(questions.find((q) => (q as { type: string }).type === 'fill_blank'))
    expect(questionProblems({ ...blank, prompt: 'Plants make food by photosynthesis ___.' } as typeof blank)).toContain('the answer appears in the prompt')
  })

  it('nothing is published before a person approves it', () => {
    expect(questions.every((q) => (q as { status: string }).status === 'in_review')).toBe(true)
  })
})
