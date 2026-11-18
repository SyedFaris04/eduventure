import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'
import { ParentView } from './ParentPage'
import { peekPendingCode, savePendingCode, takePendingCode } from './pendingCode'

const report = { week: [], questions: 20, correct: 15, lessons: 2, strong: ['Fractions'], practise: ['Photosynthesis'], streak: 4, days: 3 }
const view = (props: Partial<React.ComponentProps<typeof ParentView>>) => {
  const all = { session: 'parent' as const, code: '', kids: [], reports: {}, busy: false, onApprove: vi.fn(), onSetLimit: vi.fn(), onRemove: vi.fn(), ...props }
  render(
    <MemoryRouter>
      <ParentView {...all} />
    </MemoryRouter>,
  )
  return all
}

describe('ParentView', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('signed out: log in or create a parent account', () => {
    view({ session: 'none', code: 'ABCD-EF23' })
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login')
    expect(screen.getByRole('link', { name: 'Create a parent account' }).getAttribute('href')).toBe('/signup')
  })

  it("on the child's own phone: asks for the parent's phone and never signs out", () => {
    view({ session: 'guest', code: 'ABCD-EF23' })
    expect(screen.getByText(/open this link on your own phone/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /log out|sign out/i })).toBeNull()
  })

  it('approves only after the confirmation is ticked', () => {
    const v = view({ code: 'ABCD-EF23' })
    const approve = screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(approve)
    expect(v.onApprove).toHaveBeenCalledWith('ABCD-EF23')
  })

  it("shows each child's week, limit and remove", () => {
    const v = view({ kids: [{ child_id: 'c1', name: 'Aina', daily_limit: null }], reports: { c1: report } })
    expect(screen.getByText('Aina')).toBeTruthy()
    expect(screen.getByText('15 of 20 questions right')).toBeTruthy()
    expect(screen.getByText('Fractions')).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Daily play limit' }), { target: { value: '60' } })
    expect(v.onSetLimit).toHaveBeenCalledWith('c1', 60)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(v.onRemove).toHaveBeenCalledWith('c1')
  })
})

describe('pending parent code', () => {
  beforeEach(() => localStorage.clear())
  it('survives a log-in round trip, then is used once', () => {
    savePendingCode('ABCD-EF23')
    expect(peekPendingCode()).toBe('ABCD-EF23')
    expect(takePendingCode()).toBe('ABCD-EF23')
    expect(takePendingCode()).toBeNull()
  })
})
