import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { checkWrite } from './checkWrite'
import { fixLine } from './fixLine'
import { unitUnlocked } from './progress'

describe('checkWrite', () => {
  const step = { expected_output: 'Hi\nHi', must_use: ['for'] }
  it('passes with the right output and the required tokens', () => {
    expect(checkWrite('for i in range(2):\n  print("Hi")', 'Hi\nHi  \n', step)).toEqual({ ok: true })
  })
  it('fails on the wrong output', () => {
    expect(checkWrite('for i in range(3): print("Hi")', 'Hi\nHi\nHi', step)).toEqual({ ok: false, reason: 'output' })
  })
  it('fails when a required token is missing', () => {
    expect(checkWrite('print("Hi")\nprint("Hi")', 'Hi\nHi', step)).toEqual({ ok: false, reason: 'must_use', missing: 'for' })
  })
})

describe('fix step extracts the marked line', () => {
  const original = 'name = "Ali"\nprint("Hi, " + nam)'
  it('returns the edited line', () => {
    expect(fixLine(original, 'name = "Ali"\nprint("Hi, " + name)', 2)).toEqual({ line: 'print("Hi, " + name)' })
  })
  it('refuses when other lines changed', () => {
    expect(fixLine(original, 'name = "Mei"\nprint("Hi, " + name)', 2)).toEqual({ error: 'other-lines' })
  })
  it('refuses when lines were added or removed', () => {
    expect(fixLine(original, 'name = "Ali"\nprint("Hi, " + name)\nprint(1)', 2)).toEqual({ error: 'line-count' })
  })
  it('ignores a trailing newline the editor may add', () => {
    expect(fixLine(original, 'name = "Ali"\nprint("Hi, " + name)\n', 2)).toEqual({ line: 'print("Hi, " + name)' })
  })
})

describe('unitUnlocked', () => {
  const units = [{ lessonIds: ['a1', 'a2'] }, { lessonIds: ['b1'] }, { lessonIds: ['c1'] }]
  it('opens the first unit, then each unit after the previous ones are done', () => {
    expect(unitUnlocked(units, 0, new Set())).toBe(true)
    expect(unitUnlocked(units, 1, new Set(['a1']))).toBe(false)
    expect(unitUnlocked(units, 1, new Set(['a1', 'a2']))).toBe(true)
    expect(unitUnlocked(units, 2, new Set(['a1', 'a2']))).toBe(false)
  })
})

// ---- The lesson player, with the server, the code runner and the editor replaced by fakes ----
const api = vi.hoisted(() => ({
  startLesson: vi.fn(),
  answerStep: vi.fn(),
  noteWriteAttempt: vi.fn(),
  lessonSolution: vi.fn(),
  completeLesson: vi.fn(),
}))
const runner = vi.hoisted(() => ({ runCode: vi.fn(), runnerFor: vi.fn(), resetRunner: vi.fn() }))
vi.mock('./academyApi', async (orig) => ({ ...(await orig<object>()), ...api }))
vi.mock('./runner/runner', () => runner)
vi.mock('./CodeEditor', () => ({
  default: ({ value, onChange, readOnly, label }: { value: string; onChange?: (v: string) => void; readOnly?: boolean; label: string }) => (
    <textarea aria-label={label} value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
  ),
}))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../character/useCharacter', () => ({ useProgression: () => ({ data: { xp: 0, level: 1, gold: 0 } }) }))

const { LessonPlayer } = await import('./LessonPlayer')

const steps = [
  { id: 'py-u1-l1-s1', kind: 'learn', text: 'Press Run to see it.', code: 'print("Hello")', expected_output: 'Hello' },
  { id: 'py-u1-l1-s2', kind: 'predict', text: 'What will this print?', code: 'print("A")', options: [{ id: 'a', text: 'A' }, { id: 'b', text: '"A"' }] },
  { id: 'py-u1-l1-s3', kind: 'write', text: 'Print Hi', starter: '', expected_output: 'Hi', must_use: ['print'], hint: 'Use print().' },
]
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('LessonPlayer', () => {
  beforeAll(async () => {
    await initI18n()
  })
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    Object.values(runner).forEach((f) => f.mockReset())
    api.startLesson.mockResolvedValue({ attempt_id: 't1', lesson: { id: 'py-u1-l1', title: 'Your first print', course_id: 'python-basics', unit_index: 1, lesson_index: 1 }, steps, results: [] })
    runner.runnerFor.mockReturnValue({ ready: () => Promise.resolve() })
    runner.runCode.mockImplementation(async (_lang: string, code: string) => ({ stdout: code.includes('Hi') ? 'Hi' : code.includes('Hello') ? 'Hello' : '', error: null, timedOut: false, truncated: false }))
  })

  it('plays learn, predict and write steps, then pays the reward', async () => {
    wrap(<LessonPlayer courseId="python-basics" lessonId="py-u1-l1" language="python" onExit={() => undefined} />)
    // Learn: Run shows the output.
    fireEvent.click(await screen.findByRole('button', { name: 'Run' }))
    expect(await screen.findByText('Hello')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // Predict: a wrong pick explains and keeps Continue locked; the right one unlocks it.
    api.answerStep.mockResolvedValueOnce({ correct: false, explanation: 'Quotes are not printed.', accepted: null })
    fireEvent.click(await screen.findByRole('button', { name: '"A"' }))
    expect(await screen.findByText('Quotes are not printed.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    api.answerStep.mockResolvedValueOnce({ correct: true, explanation: 'Quotes are not printed.', accepted: 'a' })
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(api.answerStep).toHaveBeenLastCalledWith('t1', 'py-u1-l1-s2', { choice: 'a' })

    // Write: checked in the browser, nothing sent to the server for marking.
    fireEvent.change(await screen.findByLabelText('Your code'), { target: { value: 'print("Hi")' } })
    api.completeLesson.mockResolvedValue({ first_time: true, xp: 25, gold: 10, totals: { xp: 25, level: 1, gold: 10 }, leveled_up: false })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Finish lesson' }))
    expect(await screen.findByText('+25 XP')).toBeTruthy()
    expect(screen.getByText('+10 gold')).toBeTruthy()
    expect(api.answerStep).toHaveBeenCalledTimes(2)
    expect(api.completeLesson).toHaveBeenCalledWith('t1')
  })

  it('python load failure keeps the lesson usable', async () => {
    runner.runCode.mockRejectedValue(new Error('python-unavailable'))
    runner.runnerFor.mockReturnValue({ ready: () => Promise.reject(new Error('python-unavailable')) })
    wrap(<LessonPlayer courseId="python-basics" lessonId="py-u1-l1" language="python" onExit={() => undefined} />)
    const runButton = await screen.findByRole('button', { name: 'Run' })
    await act(async () => fireEvent.click(runButton))
    expect(await screen.findByText(/Python couldn't load/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    api.answerStep.mockResolvedValueOnce({ correct: true, explanation: 'ok', accepted: 'a' })
    fireEvent.click(await screen.findByRole('button', { name: 'A' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy())
  })
})
