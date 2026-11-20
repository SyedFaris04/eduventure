import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const api = vi.hoisted(() => ({ setFestivalPreview: vi.fn(async () => undefined) }))
vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
vi.mock('../festival/festivalApi', () => ({ festivalsKey: () => ['festivals'], setFestivalPreview: api.setFestivalPreview }))
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: async () => ({
          data: [
            { id: 'year_end_2026', kind: 'school_holiday', starts_on: '2026-12-05', ends_on: '2027-01-03' },
            { id: 'cny_2027', kind: 'cny', starts_on: '2027-01-30', ends_on: '2027-02-20' },
          ],
          error: null,
        }),
      }),
    }),
  },
}))

const { FestivalPreview } = await import('./FestivalPreview')
const show = () => render(<QueryClientProvider client={new QueryClient()}><FestivalPreview /></QueryClientProvider>)

describe('FestivalPreview', () => {
  afterEach(() => api.setFestivalPreview.mockClear())

  it('previews the chosen festival, with a reset when ticked', async () => {
    show()
    const select = screen.getByRole('combobox', { name: 'Festival preview' })
    await screen.findByRole('option', { name: /cny_2027/ })
    fireEvent.change(select, { target: { value: 'cny_2027' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reset my preview progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(api.setFestivalPreview).toHaveBeenCalledWith('cny_2027', true))
  })

  it('None stops the preview', async () => {
    show()
    await screen.findByRole('option', { name: /cny_2027/ })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(api.setFestivalPreview).toHaveBeenCalledWith(null, false))
  })
})
