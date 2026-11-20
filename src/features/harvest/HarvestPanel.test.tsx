import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'

vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
const api = vi.hoisted(() => ({ startHarvest: vi.fn(), answerHarvest: vi.fn() }))
vi.mock('./harvestApi', async (orig) => ({ ...(await orig<object>()), ...api }))

const { HarvestPanel } = await import('./HarvestPanel')
const { HarvestError } = await import('./harvestApi')

const question = { id: 'q', type: 'mcq', prompt: 'Which is a mammal?', options: [{ id: 'a', text: 'Cat' }, { id: 'b', text: 'Fish' }], difficulty: 1, subject: 'science' }
let client: QueryClient
const show = () => render(<QueryClientProvider client={(client = new QueryClient())}><HarvestPanel /></QueryClientProvider>)

describe('HarvestPanel', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    useGame.setState({ harvest: null })
    api.startHarvest.mockReset()
    api.answerHarvest.mockReset()
  })

  it('asks one question and shows what the player gathered', async () => {
    api.startHarvest.mockResolvedValue({ material: 'wood', question })
    api.answerHarvest.mockResolvedValue({ correct: true, correct_answer: 'a', explanation: 'Cats are mammals.', wrong_reason: null, missions_completed: [], material: 'wood', gained: 2, materials: { wood: 2, stone: 0, herbs: 0, crystal: 0 } })
    useGame.setState({ harvest: { x: 3, y: 4, material: 'wood' } })
    show()
    fireEvent.click(await screen.findByRole('button', { name: /Cat/ }))
    expect(await screen.findByText(/\+2 Wood/, undefined, { timeout: 4000 })).toBeTruthy()
    expect(api.startHarvest).toHaveBeenCalledWith('greenhaven', 3, 4)
    // The tree shows as regrowing at once, before the next refresh from the server.
    expect([...(client.getQueryData(['harvest-cooldowns', 'u', 'greenhaven']) as Set<string>)]).toEqual(['3,4'])
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(useGame.getState().harvest).toBeNull()
  }, 10000)

  it('explains when crystal needs a pickaxe, with a way out', async () => {
    api.startHarvest.mockRejectedValue(new HarvestError('harvest.errors.pickaxe'))
    useGame.setState({ harvest: { x: 1, y: 1, material: 'crystal' } })
    show()
    expect(await screen.findByText(/pickaxe/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(useGame.getState().harvest).toBeNull()
  })
})
