import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'

const api = vi.hoisted(() => ({ startLesson: vi.fn(), answerStep: vi.fn(), noteWriteAttempt: vi.fn(), lessonSolution: vi.fn(), completeLesson: vi.fn(), useCatalogue: vi.fn(), useCourseProgress: vi.fn() }))
vi.mock('./academyApi', async (orig) => ({ ...(await orig<object>()), ...api }))
vi.mock('./runner/runner', () => ({ runCode: vi.fn(), runnerFor: () => ({ ready: () => Promise.resolve() }), resetRunner: vi.fn() }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../character/useCharacter', () => ({ useProgression: () => ({ data: { xp: 0, level: 1, gold: 0 } }) }))

const { LessonPlayer } = await import('./LessonPlayer')
const { AcademyPage } = await import('./AcademyPages')

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
const lesson = (steps: unknown[]) => ({ attempt_id: 't', lesson: { id: 'en-u1-l1', title: 'Greetings', course_id: 'english-basics', unit_index: 1, lesson_index: 1 }, steps, results: [] })
const ok = { correct: true, explanation: 'Well done.', accepted: null }
const play = (steps: unknown[]) => {
  api.startLesson.mockResolvedValue(lesson(steps))
  return wrap(<LessonPlayer courseId="english-basics" lessonId="en-u1-l1" language="english" onExit={() => undefined} />)
}
const card = { id: 'en-u1-l1-s1', kind: 'card', text: 'New word', word: 'Hello', meaning: 'Helo', emoji: '👋' }
const opts = [{ id: 'a', text: 'Good morning' }, { id: 'b', text: 'Good night' }]

describe('language exercises', () => {
  beforeAll(async () => {
    await initI18n()
  })
  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()))
  afterEach(() => vi.unstubAllGlobals())

  it('card shows the emoji, word and meaning', async () => {
    play([card, { id: 'en-u1-l1-s2', kind: 'pick', text: 'Pick', prompt: 'Selamat pagi', options: opts }])
    expect(await screen.findByText('👋')).toBeTruthy()
    expect(screen.getByText('Hello')).toBeTruthy()
    expect(screen.getByText('Helo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
  })

  it('pick: a wrong pick explains, the right one unlocks Continue', async () => {
    play([{ id: 'en-u1-l1-s2', kind: 'pick', text: 'Pick the meaning', prompt: 'Selamat pagi', options: opts }, card])
    api.answerStep.mockResolvedValueOnce({ correct: false, explanation: 'Pagi means morning.', accepted: null })
    fireEvent.click(await screen.findByRole('button', { name: 'Good night' }))
    expect(await screen.findByText('Pagi means morning.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    api.answerStep.mockResolvedValueOnce(ok)
    fireEvent.click(screen.getByRole('button', { name: 'Good morning' }))
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(api.answerStep).toHaveBeenLastCalledWith('t', 'en-u1-l1-s2', { choice: 'a' })
  })

  it('build tiles move between tray and answer', async () => {
    play([{ id: 'en-u1-l1-s3', kind: 'build', text: 'Build the sentence', prompt: 'Nama saya Aina.', tiles: ['name', 'Aina.', 'I', 'My', 'is'] }, card])
    const tray = await screen.findByRole('group', { name: 'Words' })
    const line = screen.getByRole('group', { name: 'Your sentence' })
    for (const w of ['My', 'name', 'is', 'Aina.']) fireEvent.click(within(tray).getByRole('button', { name: w }))
    expect(within(line).getAllByRole('button').map((b) => b.textContent)).toEqual(['My', 'name', 'is', 'Aina.'])
    expect(within(tray).queryByRole('button', { name: 'My' })).toBeNull() // a tile is never shown twice
    fireEvent.click(within(line).getByRole('button', { name: 'is' })) // tap it out again
    expect(within(tray).getByRole('button', { name: 'is' })).toBeTruthy()
    fireEvent.click(within(tray).getByRole('button', { name: 'is' }))
    api.answerStep.mockResolvedValueOnce(ok)
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await waitFor(() => expect(api.answerStep).toHaveBeenCalledWith('t', 'en-u1-l1-s3', { order: ['My', 'name', 'Aina.', 'is'] }))
  })

  it('match needs every pair', async () => {
    play([{ id: 'en-u1-l1-s4', kind: 'match', text: 'Match the pairs', pairs: { left: ['Hello', 'Thank you', 'Goodbye'], right: ['Terima kasih', 'Selamat tinggal', 'Helo'] } }, card])
    const check = await screen.findByRole('button', { name: 'Check' })
    fireEvent.click(screen.getByRole('button', { name: 'Hello' }))
    fireEvent.click(screen.getByRole('button', { name: 'Helo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thank you' }))
    fireEvent.click(screen.getByRole('button', { name: 'Terima kasih' }))
    expect(check).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Goodbye' }))
    fireEvent.click(screen.getByRole('button', { name: 'Selamat tinggal' }))
    expect(check).toHaveProperty('disabled', false)
    api.answerStep.mockResolvedValueOnce(ok)
    fireEvent.click(check)
    await waitFor(() => expect(api.answerStep).toHaveBeenCalledWith('t', 'en-u1-l1-s4', { pairs: [['Hello', 'Helo'], ['Thank you', 'Terima kasih'], ['Goodbye', 'Selamat tinggal']] }))
  })

  it('type sends the text', async () => {
    play([{ id: 'en-u1-l1-s5', kind: 'type', text: 'Type it', prompt: 'Terima kasih' }, card])
    fireEvent.change(await screen.findByLabelText('Your answer'), { target: { value: 'Thank you' } })
    api.answerStep.mockResolvedValueOnce(ok)
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await waitFor(() => expect(api.answerStep).toHaveBeenCalledWith('t', 'en-u1-l1-s5', { text: 'Thank you' }))
  })

  it('listen steps are skipped without a voice', async () => {
    vi.stubGlobal('speechSynthesis', { getVoices: () => [], addEventListener: () => undefined, removeEventListener: () => undefined, speak: vi.fn(), cancel: vi.fn() })
    play([card, { id: 'en-u1-l1-s6', kind: 'listen', text: 'Listen', say: 'Good morning', options: opts }, { id: 'en-u1-l1-s7', kind: 'pick', text: 'Pick the meaning', prompt: 'Helo', options: opts }])
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }, { timeout: 3000 }))
    expect(await screen.findByText('Pick the meaning')).toBeTruthy() // straight past the listen step
    api.answerStep.mockResolvedValueOnce(ok)
    api.completeLesson.mockResolvedValue({ first_time: true, xp: 25, gold: 10, totals: { xp: 25, level: 1, gold: 10 }, leveled_up: false })
    fireEvent.click(screen.getByRole('button', { name: 'Good morning' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Finish lesson' }))
    expect(await screen.findByText('+25 XP')).toBeTruthy()
  })
})

describe('academies are separate', () => {
  beforeAll(async () => {
    await initI18n()
  })
  const catalogue = { courses: [{ id: 'python-basics', kind: 'code', language: 'python', title: 'Python Basics', units: [] }, { id: 'english-basics', kind: 'language', language: 'english', title: 'English for Malaysian students', units: [] }] }
  it('the Academy lists only coding courses and the Hall only language courses', () => {
    api.useCatalogue.mockReturnValue({ data: catalogue })
    api.useCourseProgress.mockReturnValue({ data: new Set() })
    const { unmount } = wrap(<AcademyPage kind="code" />)
    expect(screen.getByText('Python Basics')).toBeTruthy()
    expect(screen.queryByText('English for Malaysian students')).toBeNull()
    unmount()
    wrap(<AcademyPage kind="language" />)
    expect(screen.getByText('English for Malaysian students')).toBeTruthy()
    expect(screen.queryByText('Python Basics')).toBeNull()
    expect(screen.getByRole('heading', { name: /Language Hall/ })).toBeTruthy()
  })
})
