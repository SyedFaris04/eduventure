import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'

const rows = vi.hoisted(() => ({ missions: [] as object[] }))
const row = (o: object) => ({ subject: null, progress: 0, target: 5, completed: false, claimed: false, xp: 10, gold: 5, festival: null, tokens: 0, ends_on: null, ...o })
vi.mock('../../services/supabase', () => ({
  supabase: {
    rpc: async (fn: string) => ({ data: fn === 'my_missions' ? rows.missions : { count: 0, best: 0, today: false, rest_available: false, view: 'count', week: [], shields: 0, month_days: 0 }, error: null }),
    from: () => ({ update: () => ({ eq: () => ({ neq: async () => ({}) }) }) }),
  },
}))

const { MissionsPanel } = await import('./MissionsPanel')
const show = () => render(<QueryClientProvider client={new QueryClient()}><MissionsPanel uid="u" /></QueryClientProvider>)

describe('MissionsPanel festival section', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it("shows each festival's missions in their own section with token rewards", async () => {
    rows.missions = [
      row({ id: '1', template_id: 'd_correct_10', period: 'daily', target: 10 }),
      row({ id: '2', template_id: 'f_cny_daily', period: 'daily', festival: 'cny', tokens: 2 }),
      row({ id: '3', template_id: 'f_cny_answers', period: 'festival', festival: 'cny', target: 40, tokens: 10, ends_on: '2027-02-20' }),
      row({ id: '4', template_id: 'f_raya_harvest', period: 'festival', festival: 'raya', target: 10, tokens: 8, ends_on: '2027-03-17' }),
    ]
    show()
    const cny = await screen.findByRole('region', { name: 'Chinese New Year' })
    expect(within(cny).getByText('+2')).toBeTruthy()
    expect(within(cny).getByText(/until Feb 20/)).toBeTruthy()
    expect(within(cny).getByText(/Chinese New Year: answer 40 questions right/)).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Hari Raya' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Today' })).getAllByRole('progressbar')).toHaveLength(1)
  })

  it('hides the festival section when there are no festival missions', async () => {
    rows.missions = [row({ id: '1', template_id: 'd_correct_10', period: 'daily', target: 10 })]
    show()
    await screen.findByRole('region', { name: 'Today' })
    expect(screen.queryByRole('region', { name: 'Chinese New Year' })).toBeNull()
  })
})
