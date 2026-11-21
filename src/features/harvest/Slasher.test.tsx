import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initI18n } from '../../i18n'
import { useGame } from '../../game/store'
import { cooldownsKey } from './harvestApi'

vi.mock('../authentication/useSession', () => ({ useSession: () => ({ session: { user: { id: 'u' } } }) }))
const api = vi.hoisted(() => ({ slashHarvest: vi.fn() }))
vi.mock('./harvestApi', async (orig) => ({ ...(await orig<object>()), slashHarvest: api.slashHarvest }))

const { Slasher } = await import('./Slasher')
const { HarvestError } = await import('./harvestApi')
let client = new QueryClient()
const show = () => {
  client = new QueryClient()
  return render(<QueryClientProvider client={client}><Slasher /></QueryClientProvider>)
}
const swing = (seq: number) => act(() => useGame.setState({ slashReq: { x: 17, y: 6, material: 'wood', seq } }))

describe('Slasher', () => {
  beforeAll(async () => {
    await initI18n()
  })
  afterEach(() => {
    api.slashHarvest.mockReset()
    useGame.setState({ slashReq: null, slashSeq: 0, harvestToast: null })
  })

  it('swings three times, then harvests once and shows what was gained', async () => {
    api.slashHarvest.mockResolvedValue({ material: 'wood', gained: 2, materials: { wood: 2, stone: 0, herbs: 0, crystal: 0 }, missions_completed: [] })
    show()
    swing(1)
    swing(2)
    expect(api.slashHarvest).not.toHaveBeenCalled()
    swing(3)
    expect(api.slashHarvest).toHaveBeenCalledTimes(1)
    expect(api.slashHarvest).toHaveBeenCalledWith('greenhaven', 17, 6)
    expect(useGame.getState().slashSeq).toBe(3) // the hero swung each time
    expect(await screen.findByText('+2 Wood')).toBeTruthy()
  })

  it('says why when the server refuses', async () => {
    api.slashHarvest.mockRejectedValue(new HarvestError('harvest.errors.regrowing'))
    show()
    for (const seq of [1, 2, 3]) swing(seq)
    expect(await screen.findByText(/still regrowing/i)).toBeTruthy()
  })

  it('the harvested node looks regrown-pending at once, so more presses do nothing', async () => {
    api.slashHarvest.mockResolvedValue({ material: 'wood', gained: 2, materials: { wood: 2, stone: 0, herbs: 0, crystal: 0 }, missions_completed: [] })
    show()
    for (const seq of [1, 2, 3]) swing(seq)
    await screen.findByText('+2 Wood')
    expect((client.getQueryData(cooldownsKey('u', 'greenhaven')) as Set<string>).has('17,6')).toBe(true)
  })

  it('never replays the last swing when the world opens again', () => {
    useGame.setState({ slashReq: { x: 17, y: 6, material: 'wood', seq: 9 } })
    const view = show()
    expect(useGame.getState().slashSeq).toBe(0)
    view.unmount()
    expect(useGame.getState().slashReq).toBeNull()
  })
})
