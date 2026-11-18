import { describe, expect, it } from 'vitest'
import starter from '../../../content/questions/starter.json'
import { questionProblems, questionSource } from './questionSchema'

// Every question file, so a new batch is checked the moment it is added.
const files = import.meta.glob<{ questions: unknown[] }>('../../../content/questions/*.json', { eager: true, import: 'default' })
const questions = Object.values(files).flatMap((f) => f.questions)

describe('question bank', () => {
  it('has every question file', () => {
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(2)
  })

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

  it('has unique ids and unique prompts across all files', () => {
    const parsed = questions.map((q) => questionSource.parse(q))
    const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)
    expect(dupes(parsed.map((q) => q.id))).toEqual([])
    expect(dupes(parsed.map((q) => q.prompt.toLowerCase()))).toEqual([])
  })

  it('the starter set keeps the agreed mix', () => {
    const parsed = (starter.questions as unknown[]).map((q) => questionSource.parse(q))
    const count = (level: string, subject: string) => parsed.filter((q) => q.level_ids.length === 1 && q.level_ids[0] === level && q.subject === subject).length
    expect([count('primary', 'mathematics'), count('primary', 'science'), count('primary', 'english')]).toEqual([15, 10, 5])
    expect([count('lower_secondary', 'mathematics'), count('lower_secondary', 'science'), count('lower_secondary', 'english')]).toEqual([15, 10, 5])
    expect(parsed.filter((q) => q.level_ids.length === 11).length).toBe(10)
  })

  it('meets the Phase 3 bank size: 150 primary, 200 secondary, 150 pre-university and university', () => {
    const parsed = questions.map((q) => questionSource.parse(q))
    const tagged = (levels: string[]) => parsed.filter((q) => q.level_ids.length < 11 && q.level_ids.some((l) => levels.includes(l))).length
    expect(tagged(['primary'])).toBeGreaterThanOrEqual(150)
    expect(tagged(['lower_secondary', 'upper_secondary'])).toBeGreaterThanOrEqual(200)
    expect(tagged(['pre_university', 'diploma', 'undergraduate'])).toBeGreaterThanOrEqual(150)
    expect(parsed.length).toBeGreaterThanOrEqual(500)
  })

  it('the rules really catch broken questions', () => {
    const good = questionSource.parse(starter.questions[0]) as Extract<ReturnType<typeof questionSource.parse>, { type: 'mcq' }>
    expect(questionProblems({ ...good, answer: 'z' })).toContain('answer is not one of the options')
    expect(questionProblems({ ...good, wrong: {} }).length).toBe(good.options.length - 1)
    const blank = questionSource.parse(starter.questions.find((q) => (q as { type: string }).type === 'fill_blank'))
    expect(questionProblems({ ...blank, prompt: 'Plants make food by photosynthesis ___.' } as typeof blank)).toContain('the answer appears in the prompt')
  })

  it('every KSSR/KSSM-aligned question carries a matching curriculum tag', () => {
    const good = questionSource.parse(starter.questions[0])
    expect(good.curriculum).toBeTruthy()
    expect(questionProblems({ ...good, curriculum: undefined })).toContain('alignment names KSSR/KSSM but there is no curriculum tag')
    expect(questionProblems({ ...good, curriculum: { system: good.curriculum!.system === 'KSSR' ? 'KSSM' : 'KSSR', subject: 'Matematik', years: [1] } })).toContain('curriculum system does not match the alignment')
  })

  it('nothing is published before a person approves it', () => {
    expect(questions.every((q) => (q as { status: string }).status === 'in_review')).toBe(true)
  })
})
