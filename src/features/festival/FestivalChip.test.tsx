import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'

const state = vi.hoisted(() => ({ festivals: [] as { id: string; kind: string; starts_on: string; ends_on: string; preview: boolean }[], tokens: 0 }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('./festivalApi', () => ({ useFestivals: () => ({ data: { festivals: state.festivals, tokens: state.tokens } }) }))

const { FestivalChip } = await import('./FestivalChip')
const show = () => render(<MemoryRouter><FestivalChip /></MemoryRouter>)

describe('FestivalChip', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    state.festivals = []
  })

  it('names every festival that is on, shows the tokens, and opens the stall', () => {
    state.festivals = [
      { id: 'cny_2027', kind: 'cny', starts_on: '2027-01-30', ends_on: '2027-02-20', preview: false },
      { id: 'raya_2027', kind: 'raya', starts_on: '2027-02-09', ends_on: '2027-03-17', preview: false },
    ]
    state.tokens = 12
    show()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/shop#festival')
    expect(link.getAttribute('aria-label')).toBe('Chinese New Year · Hari Raya: 12 festival tokens. Open the festival stall')
    expect(screen.getByText('Chinese New Year · Hari Raya')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
  })

  it('shows nothing when no festival is on', () => {
    const { container } = show()
    expect(container.innerHTML).toBe('')
  })
})
