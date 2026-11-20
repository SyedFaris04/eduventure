import { describe, expect, it } from 'vitest'
import { answer, QUESTIONS, START } from './quiz'

describe('the demo question', () => {
  it('has three questions, each with its answer among the options and a reason in both languages', () => {
    expect(QUESTIONS).toHaveLength(3)
    for (const q of QUESTIONS) {
      expect(q.options.en).toContain(q.options.en[q.answer])
      expect(q.options.ms).toHaveLength(q.options.en.length)
      expect(q.why.en && q.why.ms).toBeTruthy()
    }
  })

  it('a right answer hits the monster and moves on; a wrong one explains and stays', () => {
    let s = answer(START, QUESTIONS[0].answer)
    expect(s).toMatchObject({ index: 0, hp: 2, last: 'right', done: false })
    s = answer(s, 'next')
    expect(s).toMatchObject({ index: 1, last: null })
    const wrong = (QUESTIONS[1].answer + 1) % QUESTIONS[1].options.en.length
    s = answer(s, wrong)
    expect(s).toMatchObject({ index: 1, hp: 2, last: 'wrong', done: false })
    s = answer(s, QUESTIONS[1].answer)
    expect(s).toMatchObject({ hp: 1, last: 'right' })
  })

  it('is done after the third question', () => {
    let s = START
    for (let i = 0; i < 3; i++) s = answer(answer(s, QUESTIONS[i].answer), 'next')
    expect(s.done).toBe(true)
    expect(s.hp).toBe(0)
  })
})
