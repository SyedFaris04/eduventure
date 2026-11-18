import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'
import { AskParentCard } from './AskParentCard'
import { BreakReminder } from './BreakReminder'
import { parentLink } from './links'

const card = (guardian: Parameters<typeof AskParentCard>[0]['guardian'], onAsk = vi.fn()) => {
  const r = render(<AskParentCard guardian={guardian} busy={false} onAsk={onAsk} />)
  return { ...r, onAsk }
}

describe('AskParentCard', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('asks for a code when no parent has been asked', () => {
    const { onAsk } = card({ status: 'none', minutes_today: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Ask my parent' }))
    expect(onAsk).toHaveBeenCalled()
  })

  it('shows the code with WhatsApp and copy while waiting', () => {
    card({ status: 'pending', code: 'ABCD-EF23', minutes_today: 0 })
    expect(screen.getByText('ABCD-EF23')).toBeTruthy()
    const wa = screen.getByRole('link', { name: /WhatsApp/ }) as HTMLAnchorElement
    expect(wa.href).toContain(encodeURIComponent(parentLink('ABCD-EF23')))
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy()
  })

  it('shows the minutes left once a parent has set a limit', () => {
    card({ status: 'approved', daily_limit: 60, minutes_today: 35, minutes_left: 25 })
    expect(screen.getByText('Minutes left today: 25')).toBeTruthy()
  })

  it('is empty for adults', () => {
    const { container } = card({ status: 'not_needed', minutes_today: 0 })
    expect(container.textContent).toBe('')
  })

  it('builds the parent link', () => {
    expect(parentLink('ABCD-EF23', 'http://x')).toBe('http://x/parent?code=ABCD-EF23')
  })
})

describe('BreakReminder', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('suggests a break every 40 minutes of play', () => {
    const show = (minutes: number) => (
      <MemoryRouter>
        <BreakReminder minutes={minutes} />
      </MemoryRouter>
    )
    const { rerender } = render(show(39))
    expect(screen.queryByText('Time for a stretch break!')).toBeNull()
    rerender(show(40))
    expect(screen.getByText('Time for a stretch break!')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.queryByText('Time for a stretch break!')).toBeNull()
    rerender(show(79))
    expect(screen.queryByText('Time for a stretch break!')).toBeNull()
    rerender(show(80))
    expect(screen.getByText('Time for a stretch break!')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Take a break' }).getAttribute('href')).toBe('/home')
  })
})
