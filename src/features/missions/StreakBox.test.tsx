import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { StreakBox, type Streak } from './StreakBox'

const base: Streak = { current: 12, best: 21, shields: 2, rest_available: true, today_done: true, week: [true, true, false, true, true, false, false], month_days: 14, view: 'count' }

describe('StreakBox', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('shows the streak, shields, rest day, best and this week', () => {
    render(<StreakBox streak={base} onToggleView={vi.fn()} />)
    expect(screen.getByText('12-day learning streak')).toBeTruthy()
    expect(screen.getByText('2 shields')).toBeTruthy()
    expect(screen.getByText('rest day ready')).toBeTruthy()
    expect(screen.getByText('Best: 21 days')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Played on 4 of 7 days this week' })).toBeTruthy()
  })

  it('the week view hides the number', () => {
    render(<StreakBox streak={{ ...base, view: 'week' }} onToggleView={vi.fn()} />)
    expect(screen.queryByText(/12-day/)).toBeNull()
    expect(screen.getByRole('img', { name: 'Played on 4 of 7 days this week' })).toBeTruthy()
  })

  it('a broken streak celebrates the month instead of showing zero', () => {
    const { container } = render(<StreakBox streak={{ ...base, current: 0, shields: 0 }} onToggleView={vi.fn()} />)
    expect(screen.getByText('You learned on 14 days this month — start a new streak today!')).toBeTruthy()
    expect(container.textContent).not.toMatch(/0-day/)
  })

  it('a brand-new player is invited to start', () => {
    render(<StreakBox streak={{ ...base, current: 0, best: 0, shields: 0, month_days: 0, today_done: false, week: Array(7).fill(false) }} onToggleView={vi.fn()} />)
    expect(screen.getByText('Answer a question today to start a streak')).toBeTruthy()
  })

  it('switches between the number and the week view', () => {
    const onToggleView = vi.fn()
    render(<StreakBox streak={base} onToggleView={onToggleView} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show only this week' }))
    expect(onToggleView).toHaveBeenCalled()
  })
})
