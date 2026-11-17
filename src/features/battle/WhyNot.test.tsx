import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { QuestionCard } from './QuestionCard'
import type { PublicQuestion } from './questionSchema'
import { WhyNot } from './WhyNot'

const q = { id: 'x', type: 'mcq', prompt: 'Which planet is closest to the Sun?', options: [{ id: 'a', text: 'Mercury' }, { id: 'b', text: 'Venus' }], difficulty: 1, subject: 'science', status: 'published' } as unknown as PublicQuestion
const marked = (correct: boolean) => ({ correct, correct_answer: 'a', explanation: 'Mercury orbits closest to the Sun.', wrong_reason: correct ? null : 'Venus is the second planet.' })

describe('WhyNot', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('explains the chosen wrong option and says the topic will come back', () => {
    render(<WhyNot reason="Venus is the second planet." explanation="Mercury orbits closest to the Sun." />)
    expect(screen.getByText('Why not?')).toBeTruthy()
    expect(screen.getByText('Venus is the second planet.')).toBeTruthy()
    expect(screen.getByText('Mercury orbits closest to the Sun.')).toBeTruthy()
    expect(screen.getByText('This topic will come back soon as a Returning monster.')).toBeTruthy()
  })

  it('without a reason still explains', () => {
    const { container } = render(<WhyNot reason={null} explanation="Mercury orbits closest to the Sun." />)
    expect(container.querySelectorAll('p')).toHaveLength(3) // heading, explanation, come-back line
  })

  it('appears in the question card only after a wrong answer', () => {
    const { rerender } = render(<QuestionCard question={q} busy={false} result={marked(false)} onSubmit={() => undefined} />)
    expect(screen.getByText('Why not?')).toBeTruthy()
    rerender(<QuestionCard question={q} busy={false} result={marked(true)} onSubmit={() => undefined} />)
    expect(screen.queryByText('Why not?')).toBeNull()
    expect(screen.getByText('Mercury orbits closest to the Sun.')).toBeTruthy()
  })
})
