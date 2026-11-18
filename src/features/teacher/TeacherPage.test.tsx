import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'
import { TeacherView, type ClassReport } from './TeacherPage'

const report: ClassReport = {
  quests: [{ id: 'q1', subject: 'mathematics', topic: 'Fractions', tp: 3, target: 5, due_on: '2099-01-01', finished: 1 }],
  students: [{ student_id: 's1', name: 'Aina', days: 3, questions: 4, correct: 3, quests: [{ quest_id: 'q1', progress: 2 }] }],
}
const view = (props: Partial<React.ComponentProps<typeof TeacherView>>) => {
  const all = {
    session: 'teacher' as const,
    classes: [],
    selected: null,
    report: undefined,
    catalog: [{ subject: 'mathematics', topic: 'Fractions', questions: 12, curriculum: { system: 'KSSR', subject: 'Matematik', years: [4] } }],
    busy: false,
    onCreate: vi.fn(),
    onSelect: vi.fn(),
    onCreateQuest: vi.fn(),
    onDeleteQuest: vi.fn(),
    onRemoveStudent: vi.fn(),
    onArchive: vi.fn(),
    ...props,
  }
  render(
    <MemoryRouter>
      <TeacherView {...all} />
    </MemoryRouter>,
  )
  return all
}

describe('TeacherView', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('signed out: log in or create an account', () => {
    view({ session: 'none' })
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login')
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe('/signup')
  })

  it('a guest is asked for a teacher account', () => {
    view({ session: 'guest' })
    expect(screen.getByText(/teachers need their own account/i)).toBeTruthy()
  })

  it('creates a class', () => {
    const v = view({})
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: '6 Bestari' } })
    fireEvent.change(screen.getByLabelText('School (optional)'), { target: { value: 'SK Taman' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }))
    expect(v.onCreate).toHaveBeenCalledWith('6 Bestari', 'SK Taman')
  })

  it('lists classes with their code, and opens one', () => {
    const v = view({ classes: [{ id: 'c1', name: '6 Bestari', school: null, code: 'ABCD-EF23', members: 2 }] })
    expect(screen.getByText('ABCD-EF23')).toBeTruthy()
    expect((screen.getByRole('link', { name: /WhatsApp/ }) as HTMLAnchorElement).href).toContain('ABCD-EF23')
    fireEvent.click(screen.getByRole('button', { name: /open 6 Bestari/i }))
    expect(v.onSelect).toHaveBeenCalledWith('c1')
  })

  it('shows the class report and sets a quest', () => {
    const v = view({ classes: [{ id: 'c1', name: '6 Bestari', school: null, code: 'ABCD-EF23', members: 1 }], selected: 'c1', report })
    const table = within(screen.getByRole('table', { name: 'Students' }))
    expect(table.getByText('Aina')).toBeTruthy()
    expect(table.getByText('3 of 4 right')).toBeTruthy()
    expect(table.getByText('2 / 5')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'mathematics|Fractions' } })
    fireEvent.change(screen.getByLabelText('Right answers needed'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Due'), { target: { value: '2099-02-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set quest' }))
    expect(v.onCreateQuest).toHaveBeenCalledWith({ subject: 'mathematics', topic: 'Fractions', tp: null, target: 10, due: '2099-02-01' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Aina' }))
    expect(v.onRemoveStudent).toHaveBeenCalledWith('s1')
  })
})
