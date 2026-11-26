import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { QuestionCard } from './QuestionCard'
import type { PublicQuestion } from './questionSchema'

describe('QuestionCard', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('shows a code-reading program as code, keeping its lines and indentation', () => {
    const q = { id: 'x', type: 'mcq', prompt: 'What does this Python code print?\n\nfor i in range(2):\n    print(i)', options: [{ id: 'a', text: '0' }, { id: 'b', text: '1' }, { id: 'c', text: '2' }], difficulty: 1, subject: 'programming', status: 'published' } as unknown as PublicQuestion
    const { container } = render(<QuestionCard question={q} busy={false} result={null} onSubmit={() => undefined} />)
    expect(screen.getByText('What does this Python code print?')).toBeTruthy()
    const code = container.querySelector('pre code')
    expect(code?.textContent).toBe('for i in range(2):\n    print(i)')
  })

  it('keeps ordinary prompts as plain text', () => {
    const q = { id: 'y', type: 'true_false', prompt: 'True or false: 0.7 is greater than 0.65.', difficulty: 1, subject: 'mathematics', status: 'published' } as unknown as PublicQuestion
    const { container } = render(<QuestionCard question={q} busy={false} result={null} onSubmit={() => undefined} />)
    expect(container.querySelector('pre')).toBeNull()
  })

  it('question text keeps its own direction, so English reads right in an Arabic layout ("What…?", not "?What…")', () => {
    const q = { id: 'z', type: 'mcq', prompt: 'What is the angle of reflection?', options: [{ id: 'a', text: '30 degrees.' }, { id: 'b', text: '60 degrees.' }], difficulty: 1, subject: 'science', status: 'published' } as unknown as PublicQuestion
    const marked = { correct: true, correct_answer: 'a', explanation: 'The angles are equal.', wrong_reason: null }
    render(<QuestionCard question={q} busy={false} result={marked} onSubmit={() => undefined} />)
    expect(screen.getByText('What is the angle of reflection?').getAttribute('dir')).toBe('auto')
    expect(screen.getByText('30 degrees.').tagName).toBe('BDI') // isolated inside the answer button
    expect(screen.getByText('The angles are equal.').getAttribute('dir')).toBe('auto')
  })
})
